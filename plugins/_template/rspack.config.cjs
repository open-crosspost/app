const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");
const { EveryPluginDevServer } = require("every-plugin/build/rspack");
const { withZephyr } = require("zephyr-rspack-plugin");
const pkg = require("./package.json");

const shouldDeploy = process.env.DEPLOY === "true";

const baseConfig = {
  plugins: [
    new EveryPluginDevServer(),
    {
      apply(compiler) {
        compiler.hooks.afterEmit.tapPromise("EmitPluginManifest", async () => {
          const outDir = compiler.options.output?.path
            ? compiler.options.output.path
            : path.resolve(__dirname, "dist");

          const sourceContractPath = path.join(__dirname, "types", "contract.d.ts");
          const publishedContractPath = path.join(outDir, "types", "contract.d.ts");
          const contractTypes = await fs.promises.readFile(sourceContractPath, "utf8");
          await fs.promises.mkdir(path.dirname(publishedContractPath), { recursive: true });
          await fs.promises.writeFile(publishedContractPath, contractTypes);
          const contractSha256 = crypto.createHash("sha256").update(contractTypes).digest("hex");

          const manifest = {
            schemaVersion: 1,
            kind: "every-plugin/manifest",
            plugin: {
              name: pkg.name,
              version: pkg.version,
            },
            runtime: {
              remoteEntry: "./remoteEntry.js",
            },
            contract: {
              kind: "orpc",
              types: {
                path: "./types/contract.d.ts",
                exportName: "contract",
                typeName: "ContractType",
                sha256: contractSha256,
              },
            },
          };

          await fs.promises.mkdir(outDir, { recursive: true });
          await fs.promises.writeFile(
            path.join(outDir, "plugin.manifest.json"),
            `${JSON.stringify(manifest, null, 2)}\n`,
          );
        });
      },
    },
  ],
  infrastructureLogging: {
    level: "error",
  },
  stats: "errors-warnings",
};

module.exports = shouldDeploy
  ? withZephyr({
      hooks: {
        onDeployComplete: (info) => {
          console.log("🚀 Template Plugin Deployed:", info.url);
        },
      },
    })(baseConfig)
  : baseConfig;
