---
"ui": patch
---

Consolidate auth helpers into `@/lib/auth` and `@/app`, removing the deleted `@/lib/session` barrel. Replace singleton `getAuthClient()` with router-context `useAuthClient()`, align `sessionQueryOptions` to require `authClient` param, and switch `better-auth`/`better-near-auth` to catalog versions. Delete dead `api-contract`/`api-client`/`use-api-client` files superseded by `lib/api.ts`.
