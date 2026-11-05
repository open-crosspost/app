---
"ui": patch
---

Stop the editor crashing with `Cannot read properties of undefined (reading 'id')` when opened without a `?campaign=` param (the post-login landing and direct `/editor` navigation both hit it): `campaignSeedQueryOptions` now accepts an optional campaign id and derives `enabled` itself, matching the `nearSocialAccountQueryOptions` pattern — the gating lives in the factory instead of an eager non-null assertion at the call site.
