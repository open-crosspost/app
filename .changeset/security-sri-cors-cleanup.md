---
"everything-dev": minor
"host": patch
"ui": patch
"api": patch
---

## Security hardening: SRI integrity, CORS tightening, and config cleanup

### Subresource Integrity (SRI) for remote entries

- **New `everything-dev/integrity` module** with `computeSriHash`, `computeSriHashForUrl`, and `verifySriForUrl` — single source of truth for all integrity operations
- **Deploy hooks** now compute SHA-384 hashes of `remoteEntry.js` and write `productionIntegrity`/`ssrIntegrity` to `bos.config.json` on deploy
- **Client-side SRI**: `<script>` tags for remote entries now include `integrity` and `crossorigin="anonymous"` attributes
- **Server-side SRI verification** before loading SSR modules, API plugins, and UI federation remotes
- **Integrity plumbing**: `productionIntegrity` and `ssrIntegrity` fields flow through `BosConfig` → `RuntimeConfig` → `ClientRuntimeConfig` → HTML rendering

### CORS hardening

- **`host/src/services/auth.ts`**: Better Auth `trustedOrigins` now falls back to `[hostUrl, ...uiUrl]` instead of `[]` when `CORS_ORIGIN` is unset, aligning with Hono CORS middleware
- **`host/src/program.ts`**: Production warning when `CORS_ORIGIN` is unset; fixed bug where empty `uiConfig.url` could be included as a CORS origin
- **`packages/everything-dev/src/host.ts`**: CORS origins now include UI URL in fallback; production warning added
- **Production warning** added for missing `BETTER_AUTH_SECRET`

### Config / type cleanup

- **Removed `resolvedConfig` and `canonicalConfigUrl`** from `ClientRuntimeInfo` — these leaked arbitrary config data to the client
- **Renamed `ActiveRuntimeInfo`** to `ClientRuntimeInfo` everywhere for consistency
- **Deduplicated `SharedDepConfigSchema`** — now an alias for `SharedConfigSchema`
- **Added `productionIntegrity`** to `BosConfigInput` interface, removing `as any` cast
- **Added `testnet`** to `BosConfigSchema`

### Bug fixes

- Fixed trailing slash inconsistency in host's SSR URL construction
- Fixed SRI integrity check being inside Effect retry scope (now fails fast, only module loading is retried)
- Added `integrity` verification to API plugin loading (`everything-dev/src/api.ts` and `host/src/services/plugins.ts`)

### Breaking changes

- `ActiveRuntimeInfo` type removed — use `ClientRuntimeInfo`
- `resolvedConfig` and `canonicalConfigUrl` removed from `ClientRuntimeInfo`
- `BetterAuth` `trustedOrigins` default changed from `[]` to `[hostUrl, ...uiUrl]`