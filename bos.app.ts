import { App } from "everything-dev/descriptor";

// Authored app descriptor. The published config is canonicalized to JSON
// from this file; dev-only overrides live in bos.dev.ts (never published).
export default App({
  name: "opencrosspost.com",
  extends: "bos://dev.everything.near/everything.dev",
  platform: "2.0.0-rc.27",
  account: "work.efiz.near",
  domain: "opencrosspost.com",
  title: "Open Crosspost",
  description:
    "Write once and share to X, Farcaster, and more social platforms from one place. Open Crosspost is coming soon.",
  repository: "https://github.com/open-crosspost/app",
  ui: {
    path: "ui",
  },
  api: {
    path: "api",
    secrets: [
      "API_DATABASE_URL",
      "API_DATABASE_AUTH_TOKEN",
      "BETTER_AUTH_SECRET",
      "X_CLIENT_ID",
      "X_CLIENT_SECRET",
      "X_CONNECT_PROJECT",
      "X_POLICY_MAX_PER_DAY",
      "OUTLAYER_APP_WALLET_KEY",
      "ACTIVITY_API_KEY",
      "ACTIVITY_SOURCE_ID",
    ],
  },
  plugins: {
    auth: {
      variables: {
        passkey: {
          rpID: "opencrosspost.com",
          rpName: "Open Crosspost",
        },
      },
    },
    "agent-connect": {
      path: "plugins/agent-connect",
      secrets: [
        "NEAR_INTENTS_AGENT_API_KEY",
        "AGENT_CONNECT_ENCRYPTION_KEY",
        "AGENT_CONNECT_DATABASE_URL",
      ],
    },
    connectors: {
      path: "plugins/connectors",
      dependsOn: ["agent-connect"],
      variables: {
        XPOST_GATE_ENABLED: true,
        XPOST_TIER_REFRESH_ENABLED: true,
      },
      secrets: [
        "NEAR_INTENTS_AGENT_API_KEY",
        "CONNECTORS_DATABASE_URL",
        "OUTLAYER_APP_PAYMENT_KEY",
        "ACTIVITY_API_KEY",
        "ACTIVITY_SOURCE_ID",
      ],
    },
    twitter: {
      path: "plugins/twitter",
      secrets: ["X_CLIENT_ID", "X_CLIENT_SECRET"],
    },
  },
});
