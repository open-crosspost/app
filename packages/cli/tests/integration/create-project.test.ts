import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config";
import { startMockFastKvServer } from "../support/fastkv-server";

const CLI_PATH = join(__dirname, "../../src/cli.ts");

async function runCommand(
  args: string[],
  options: { cwd: string; env?: Record<string, string>; timeout: number },
) {
  const command = ["bun", ...args].map(escapeShellArg).join(" ");
  const proc = Bun.spawn({
    cmd: ["/bin/sh", "-lc", command],
    cwd: options.cwd,
    env: options.env,
    stdout: "pipe",
    stderr: "pipe",
  });

  const timeoutId = setTimeout(() => proc.kill(), options.timeout);
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  clearTimeout(timeoutId);

  return { stdout, stderr, exitCode };
}

function escapeShellArg(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

describe("Create Project Integration", () => {
  let tempDir: string;
  let fastKvServer: Awaited<ReturnType<typeof startMockFastKvServer>>;
  let fastKvEnv: Record<string, string>;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "bos-create-project-"));
    fastKvServer = await startMockFastKvServer([
      {
        current_account_id: "registry.everything.near",
        predecessor_id: "every.near",
        key: "apps/every.near/everything.dev/bos.config.json",
        value: {
          account: "every.near",
          template: "near-everything/every-plugin/demo",
          gateway: {
            development: "http://localhost:8787",
            production: "https://everything.dev",
          },
          shared: {
            ui: {
              react: { version: "18.3.1", requiredVersion: "^18.3.1" },
            },
          },
          app: {
            host: {
              development: "http://localhost:3000",
              production: "https://everything.dev",
              secrets: ["HOST_DATABASE_URL"],
            },
            ui: {
              name: "ui",
              development: "http://localhost:3002",
              production: "https://ui.everything.dev",
            },
            api: {
              name: "api",
              development: "http://localhost:3014",
              production: "https://api.everything.dev",
              secrets: ["API_DATABASE_URL"],
              variables: {},
            },
          },
        },
      },
    ]);
    fastKvEnv = {
      ...process.env,
      REGISTRY_FASTKV_MAINNET_URL: fastKvServer.url,
    };
    process.env.REGISTRY_FASTKV_MAINNET_URL = fastKvServer.url;
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
    await fastKvServer.close();
    delete process.env.REGISTRY_FASTKV_MAINNET_URL;
  });

  it("creates project with all args (no prompts)", async () => {
    const projectName = "testproject";
    const projectDir = join(tempDir, projectName);

    // Run create command with all args
    const result = await runCommand(
      [
        "run",
        CLI_PATH,
        "create",
        "project",
        projectName,
        "--account",
        "testproject.near",
        "--testnet",
        "testproject.testnet",
        "--template",
        "bos://every.near/everything.dev",
      ],
      {
        cwd: tempDir,
        env: fastKvEnv,
        timeout: 120000,
      },
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Created project");

    // Verify project structure
    const entries = await readdir(projectDir);
    expect(entries).toContain("api");
    expect(entries).toContain("ui");
    expect(entries).not.toContain("host"); // Not included by default
    expect(entries).not.toContain("gateway"); // Not included by default
    expect(entries).toContain("bos.config.json");
    expect(entries).toContain("package.json");
    expect(entries).toContain(".gitignore");
    expect(entries).toContain("bunfig.toml");
    expect(entries).toContain(".env.example");
    expect(entries).toContain(".agent");

    // Verify bos.config.json structure
    const bosConfig = JSON.parse(await readFile(join(projectDir, "bos.config.json"), "utf8"));
    expect(bosConfig.extends).toBe("bos://every.near/everything.dev");
    expect(bosConfig.account).toBe("testproject.near");
    expect(bosConfig.testnet).toBe("testproject.testnet");
    expect(bosConfig.app).toBeDefined();
    expect(bosConfig.app.ui).toBeDefined();
    expect(bosConfig.app.api).toBeDefined();
    expect(bosConfig.app.host).toBeUndefined(); // Should NOT be present (inherited from extends)

    // Verify package.json workspaces only include api and ui
    const pkgJson = JSON.parse(await readFile(join(projectDir, "package.json"), "utf8"));
    expect(pkgJson.workspaces.packages).toEqual(["api", "ui"]);

    // Verify .agent/skills/bos/ exists (fetched from template)
    const agentDir = join(projectDir, ".agent", "skills", "bos");
    const agentEntries = await readdir(agentDir);
    expect(agentEntries).toContain("SKILL.md");

    // Verify AGENTS.md exists (fetched from template)
    const agentsMd = await readFile(join(projectDir, "AGENTS.md"), "utf8");
    expect(agentsMd).toContain("<skills_system");
    expect(agentsMd).toContain("<available_skills>");
    expect(agentsMd).toContain("bos");

    // Verify .env.example has secrets
    const envExample = await readFile(join(projectDir, ".env.example"), "utf8");
    expect(envExample).toContain("HOST_DATABASE_URL=");
    expect(envExample).toContain("API_DATABASE_URL=");

    // Verify excluded files were removed
    const excludedFiles = ["database.db", ".bos", ".env", ".env.bos"];
    for (const file of excludedFiles) {
      await expect(stat(join(projectDir, file))).rejects.toThrow();
    }

    // Load the config and verify extends works
    const loadedConfig = await loadConfig({ cwd: projectDir });
    expect(loadedConfig).not.toBeNull();
    expect(loadedConfig?.config.account).toBe("testproject.near");
    // Should inherit app.host from everything.dev
    expect(loadedConfig?.config.app.host).toBeDefined();
    expect(loadedConfig?.config.gateway).toBeDefined();
  }, 120000); // 2 minute timeout for git clone + network

  it("creates project with host and gateway when flags provided", async () => {
    const projectName = "fullproject";
    const projectDir = join(tempDir, projectName);

    const result = await runCommand(
      [
        "run",
        CLI_PATH,
        "create",
        "project",
        projectName,
        "--account",
        "fullproject.near",
        "--include-host",
        "--include-gateway",
      ],
      {
        cwd: tempDir,
        env: fastKvEnv,
        timeout: 120000,
      },
    );

    expect(result.exitCode).toBe(0);

    // Verify host and gateway are included
    const entries = await readdir(projectDir);
    expect(entries).toContain("host");
    expect(entries).toContain("gateway");

    // Verify package.json has all workspaces
    const pkgJson = JSON.parse(await readFile(join(projectDir, "package.json"), "utf8"));
    expect(pkgJson.workspaces.packages).toEqual(
      expect.arrayContaining(["api", "ui", "host", "gateway"]),
    );
  }, 120000);

  it("does not include testnet when not provided", async () => {
    const projectName = "mainnetonly";
    const projectDir = join(tempDir, projectName);

    await runCommand(
      ["run", CLI_PATH, "create", "project", projectName, "--account", "mainnetonly.near"],
      {
        cwd: tempDir,
        env: fastKvEnv,
        timeout: 120000,
      },
    );

    const bosConfig = JSON.parse(await readFile(join(projectDir, "bos.config.json"), "utf8"));
    expect(bosConfig.account).toBe("mainnetonly.near");
    expect(bosConfig.testnet).toBeUndefined(); // Should NOT be present
  }, 120000);

  it("can run bos sync after creation", async () => {
    const projectName = "everytest";
    const projectDir = join(tempDir, projectName);

    // Create project
    await runCommand(
      ["run", CLI_PATH, "create", "project", projectName, "--account", "every.near"],
      {
        cwd: tempDir,
        env: fastKvEnv,
        timeout: 120000,
      },
    );

    // Run sync (using update command which syncs files)
    const syncResult = await runCommand(["run", CLI_PATH, "update"], {
      cwd: projectDir,
      env: fastKvEnv,
      timeout: 60000,
    });

    expect(syncResult.exitCode).toBe(0);
    // Sync should populate any missing pieces from template
  }, 120000);
});
