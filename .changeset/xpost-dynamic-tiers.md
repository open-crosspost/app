---
"@outlayer-connectors/connectors-plugin": minor
---

Dynamic XPOST tier engine: tier thresholds live in a `gate_config` row recomputed daily from the Ref pools (XPOST/wNEAR 6055 + wNEAR/USDT 6063), drift-capped ±25%/day, fail-safe on price-read errors. New admin routes (`xpostGateConfigSet`, `xpostGateConfigRefresh`) and a public `xpostGateStatus` returning the caller's resolved tier. Gate enablement and the daily refresh are config flags (`XPOST_GATE_ENABLED`, `XPOST_TIER_REFRESH_ENABLED`) — both on in `bos.app.ts`.
