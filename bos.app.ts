import { App } from "everything-dev/descriptor";

// Authored app descriptor. The published config is canonicalized to JSON
// from this file; dev-only overrides live in bos.dev.ts (never published).
export default App({
  "name": "opencrosspost.com",
  "extends": "bos://dev.everything.near/dev.everything.dev",
  "account": "work.efiz.near",
  "domain": "opencrosspost.com",
  "title": "Open Crosspost",
  "description": "Write once and share to X, Farcaster, and more social platforms from one place. Open Crosspost is coming soon.",
  "repository": "https://github.com/open-crosspost/app",
  "ui": {
    "path": "ui"
  },
  "api": {
    "path": "api",
    "secrets": [
      "API_DATABASE_URL",
      "X_CLIENT_ID",
      "X_CLIENT_SECRET"
    ]
  },
  "plugins": {
    "crosspost": {
      "path": "plugins/crosspost",
      "variables": {
        "baseUrl": "https://social.invalid",
        "timeout": 10000
      },
      "secrets": [
        "nearAuthData"
      ]
    },
    "twitter": {
      "path": "plugins/twitter",
      "secrets": [
        "X_CLIENT_ID",
        "X_CLIENT_SECRET"
      ]
    },
    "farcaster": {
      "path": "plugins/farcaster",
      "variables": {
        "ipfsGatewayUrl": "https://gateway.pinata.cloud/ipfs",
        "timeout": 10000
      },
      "secrets": [
        "farcasterDeveloperMnemonic",
        "neynarApiKey",
        "pinataJwt"
      ]
    }
  }
});
