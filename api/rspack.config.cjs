const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");
const { EveryPluginDevServer } = require("every-plugin/build/rspack");
const { withZephyr } = require("zephyr-rspack-plugin");
const pkg = require("./package.json");

const shouldDeploy = process.env.DEPLOY === "true";

function updateHostConfig(name, url) {
  try {
    const configPath = path.resolve(__dirname, "../bos.config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

    if (config.app.api.name !== name) {
      console.error(`   ❌ API "${name}" not found in bos.config.json`);
      return;
    }

    config.app.api.production = url;
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
    console.log(`   ✅ Updated bos.config.json: app.api.production`);
  } catch (err) {
    console.error("   ❌ Failed to update bos.config.json:", err.message);
  }
}

function emitPluginManifest() {
  return {
    apply(compiler) {
      compiler.hooks.thisCompilation.tap("EmitPluginManifest", (compilation) => {
        const webpack = compiler.webpack;
        const RawSource = webpack?.sources?.RawSource;
        const stage = webpack?.Compilation?.PROCESS_ASSETS_STAGE_ADDITIONS ?? 1000;

        compilation.hooks.processAssets.tapPromise(
          { name: "EmitPluginManifest", stage },
          async () => {
            const sourceContractPath = path.join(__dirname, "types", "contract.d.ts");
            const contractTypes = await fs.promises.readFile(sourceContractPath, "utf8");
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

            if (RawSource) {
              compilation.emitAsset(
                "plugin.manifest.json",
                new RawSource(`${JSON.stringify(manifest, null, 2)}\n`),
              );
              compilation.emitAsset("types/contract.d.ts", new RawSource(contractTypes));
            }
          },
        );
      });
    },
  };
}

const baseConfig = {
  externals: [/^@libsql\/.*/],
  plugins: [new EveryPluginDevServer(), emitPluginManifest()],
  infrastructureLogging: {
    level: "error",
  },
  stats: "errors-warnings",
};

module.exports = shouldDeploy
  ? withZephyr({
      hooks: {
        onDeployComplete: (info) => {
          console.log("🚀 API Deployed:", info.url);
          updateHostConfig(pkg.name, info.url);
        },
      },
    })(baseConfig)
  : baseConfig;
