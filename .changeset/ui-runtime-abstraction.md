---
"everything-dev": minor
"ui": minor
"host": patch
---

Abstract UI runtime into everything-dev package

- Moved router creation, SSR rendering, and hydration into everything-dev/ui
- Split package exports into ./ui/client (browser-safe) and ./ui/server (SSR)
- Added networkId derivation from account suffix (testnet/mainnet)
- Created canonical ui/src/app.ts barrel for apiClient, authClient, runtime helpers
- Deleted ui/src/remote/* indirection layer
- Added API contract manifest with checksum for type sync
- Added everything-dev types sync CLI command
