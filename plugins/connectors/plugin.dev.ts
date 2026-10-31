import "dotenv/config";
import type { PluginConfigInput } from "every-plugin";
import type Plugin from "./src/index";

export default {
  port: Number(process.env.PORT) || 3018,
  config: {
    variables: {
      agentApiBaseUrl: process.env.AGENT_API_BASE_URL || undefined,
      outlayerApiUrl: process.env.OUTLAYER_API_URL || undefined,
    },
    secrets: {
      NEAR_INTENTS_AGENT_API_KEY: process.env.NEAR_INTENTS_AGENT_API_KEY,
      CONNECTORS_DATABASE_URL:
        process.env.CONNECTORS_DATABASE_URL || "pglite:.bos/connectors/:memory:",
    },
  } satisfies PluginConfigInput<typeof Plugin>,
};
