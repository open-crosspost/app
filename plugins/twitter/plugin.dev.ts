import "dotenv/config";
import type { PluginConfigInput } from "every-plugin";
import packageJson from "./package.json" with { type: "json" };
import type Plugin from "./src/index";

export default {
  pluginId: packageJson.name,
  port: 3015,
  config: {
    variables: {},
    secrets: {
      X_CLIENT_ID: process.env.X_CLIENT_ID || "",
      X_CLIENT_SECRET: process.env.X_CLIENT_SECRET || "",
    },
  } satisfies PluginConfigInput<typeof Plugin>,
};
