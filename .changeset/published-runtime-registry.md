---
"host": minor
"api": minor
"ui": minor
---

Add a published runtime registry with host-aware runtime resolution and explorer flows.

- Add registry discovery, detail, metadata preparation, and relay APIs for published BOS configs
- Resolve active runtimes in the host so published apps can run from canonical host URLs or `_runtime` overrides
- Add UI pages for browsing published apps, inspecting runtime config, and publishing registry metadata
