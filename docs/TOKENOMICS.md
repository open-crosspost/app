# XPOST Tokenomics — monetizing Open Crosspost

> Drafted 2026-10-31. The source of truth for XPOST utility, tier thresholds,
> and the credit-pack flow. Tickets reference this doc; changes to the model
> land here first.
>
> Grounding facts measured/verified 2026-10-31: per-post compute cost, token
> contract metadata, pool state. See the E2E.md probe section for the bridge
> work these tiers ride on.

## 1. The unit economics (measured, not estimated)

| Cost item | Value | Notes |
|---|---|---|
| OutLayer compute, X post (preview project) | **$0.001001** | `compute_cost: 1001` micros USDC, observed live. Operation fees only start on curated connectors |
| NEAR Social post | **~$0** | Gasless relay; user carries their own storage deposit |
| Annual cost of a daily-GM user | **~$0.37** | Compute is *not* the scarce resource |
| The real scarcity | **The X app's post quota** | Per-app rate limits are shared by ALL users — the gate rations this, not compute |
| The real fixed costs | X developer account, OutLayer program agreement (#8), dev time | Orders of magnitude above per-post compute |

Conclusion: cost-recovery math does not set prices at $0.001/post. The gate
**rations a scarce quota** and **creates token demand**; the credit packs
**monetize** with a stated margin.

## 2. The token (facts from the contract + launchpad)

- Contract: `xpost-1634.meme-cooking.near` — "open crosspost" (XPOST),
  **1,000,000,000 supply, 18 decimals**.
- Launchpad: meme.cooking — an **auction-based fair launch, NOT a bonding
  curve** (every depositor bought at one price; all NEAR deposited became a
  **locked** LP; token trades on Ref Finance). No per-trade creator fee
  exists — the platform takes nothing from trading.
- Pool state at drafting: **$10.316K locked liquidity, $12.011K market cap →
  XPOST ≈ $0.000012**.
- Treasury: **20% (200M XPOST ≈ $2.4K today)**. Consequence: the ONLY
  trading-related upside is treasury appreciation — which makes the product
  itself the demand engine. At $10.3K liquidity, ~$5K of net product-driven
  buying ≈ 2× the price.

## 3. Loop 1 — Hold tiers (admission; gate BUILT, off by default)

The dispatch gate (`connectors.outlayerCall`) reads the caller's session NEAR
account balance before spending anything; refusal is fail-closed and free.

| Tier | Hold (initial) | ~$ at drafting | Unlocks |
|---|---|---|---|
| 0 | 0 | — | NEAR Social posting (free for us), browse campaigns |
| 1 | **100,000 XPOST** | ~$1.20 | X connect + manual GM, app-paid, daily cap |
| 2 | **1,000,000** | ~$12 | Auto-GM scheduler (#20), higher caps, multi-destination |
| 3 | **10,000,000** | ~$120 | Agent campaigns (B2: grants, per-post proofs), API keys |

Design notes:

- Tier 3 = 1% of supply — **scarce by design** (~80 such holders possible
  from the 80% float). The prosumer tier should be small.
- **Non-holders keep the BYO/fund-link path** (already built) — a freemium
  boundary, not a meme-token paywall. The gate sells convenience (sponsored
  posts), not access.
- **Every paid path is wallet-anchored**: the gate reads the session's NEAR
  account balance and packs are `ft_transfer`s — anonymous (wallet-less)
  sessions get Tier 0 by construction. The wallet prompt belongs at the
  *paywall*, not at signup: connect (SIWN) → the session links
  `walletAddress` → `onLinkAccount` migrates the anonymous data → tiers and
  packs then apply. No custodial user funds ever.
- Fixed token amounts, **no oracle at dispatch time** — predictable UX, zero
  infra. Recalibration is a config change (below), not code.

### 1a. Dynamic thresholds (daily, no git noise)

Tiers are **pinned to USD targets** (~$1.20 / $12 / $120) by a daily refresh:

- **Price source**: the Ref pools themselves — two free RPC view calls
  (`get_pool` on the XPOST/wNEAR pool **6055** and the deep USD leg,
  wNEAR/USDT pool **6063** — there is no deep wNEAR/USDC pool, so USDT is
  the USD reference). On-chain, deterministic, no API key.
- **Storage**: a `gate_config` row in the connectors plugin DB. Resolution at
  dispatch: **DB row → plugin-variable defaults** (the static ladder above).
- **Refresh**: a 24h interval in the plugin `initialize` — the same tick
  pattern the #20 scheduler will use (one mechanism, two consumers). Each
  run: price → thresholds = target-$ / price → snap to pretty numbers
  (1/2/5 × 10ⁿ).
- **Fail-safe**: a failed price read keeps yesterday's row — an outage never
  widens or tightens the gate.
- **Drift cap**: thresholds move at most **±25%/day** — a pool wobble or a
  single whale pump cannot reprice tiers wildly. Manual lever: an admin route
  reads/writes the row directly.

## 4. Loop 2 — Credit packs (direct revenue; the real line)

"Buy 1,000 sponsored posts" — one `ft_transfer` to the app treasury.

- **Pricing**: 44% margin over compute — ~150,000 XPOST per 1,000-post pack
  (~$1.80 at spot for $1.00 of compute). Credits are USD-denominated; XPOST
  accepted at spot; the premium is stated in USD up front.
- **Enforcement**: the allowance lives **app-side**, counted from the bridge
  event log — same mechanism as per-user caps. No OutLayer changes.
- **Treasury route**: hold 50% / swap 50% on Ref into the app wallet to fund
  the shared payment key. Sell pressure is sized to actual compute burn
  (tiny) — the swap never moves the pool.
- Works for **non-holders too** — this is how the freemium boundary
  monetizes, and it is whale-independent.
- Pack pricing is an env knob (`packPremiumUsd` / `packPosts`), decided
  finally at launch.

## 5. Loop 3 — Agent tier pays in XPOST (B2; the demand flywheel)

XPOST is not — and will not be — a NEAR Intents asset (a $10K meme token gets
no solver routing). The loop therefore runs through Ref, not intents:

**Agent budget packs**: pay XPOST to the treasury → the api credits the
agent's owner-signed budget line → the app pays OutLayer in USDC from its
float. Users never touch USDC; the app absorbs the swap. Same treasury route
as Loop 2.

This makes XPOST the **payment token for the premium tier** — the strongest
sustained buy pressure a $10K pool can absorb — and it composes with
everything B2 already builds (grants, budget caps, per-post proofs).

## 6. Revenue summary

1. **Pack premium** (~44% over compute) — starts accruing day one,
   whale-independent.
2. **Treasury appreciation** — 200M XPOST rides the demand the tiers and
   packs create; at $10.3K locked liquidity the product demand *is* the price
   mover.
3. Later: **sponsor codes** (#15) shift compute cost to a negotiated OutLayer
   program, widening the pack margin.

## 7. Risk policies

- **Threshold staleness**: price moves 2× on ~$5K of demand → tiers
  recalibrate automatically (daily refresh, drift-capped). Review the USD
  targets quarterly.
- **Perception**: freemium boundary + "credits at spot, premium stated in
  USD" keeps the model honest against "meme paywall" readings.
- **Treasury rule**: 50/50 hold/swap on pack inflows, published here; any
  change to the split is a doc change first.
- **Fail-closed always**: gate or price-read failures refuse the dispatch
  before money moves; nothing is ever charged on a refusal.
- **No burn**: packs lock in the treasury (then partially fund compute) —
  deflation burns revenue. Revisit only if the supply overhang becomes the
  binding constraint.
