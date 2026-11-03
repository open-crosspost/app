# XPOST Tokenomics — monetizing Open Crosspost (v2)

> Drafted 2026-10-31; **rewritten 2026-11-02 as v2** — the pack model is
> gone. v2 model: consumers post free (app-paid, capped), heavy users hold
> XPOST to raise their caps, agents pay a NEAR-denominated subscription
> with an XPOST discount, and 20% of subscription revenue buys XPOST
> weekly on Ref. The source of truth for XPOST utility, tier thresholds,
> and the subscription/buyback flow. Changes to the model land here first.
>
> Grounding facts measured/verified 2026-10-31 (compute cost, token
> contract metadata, pool state) and 2026-11-02 (X API pay-per-usage
> rates — docs.x.com/x-api/getting-started/pricing). See E2E.md for the
> bridge work the tiers ride on. The connector's wholesale fee deal with
> OutLayer is negotiated in [`TERMS-x-connector.md`](./TERMS-x-connector.md).

## 1. The unit economics (measured, not estimated)

| Cost item | Value | Notes |
|---|---|---|
| X API post write (pay-per-usage) | **$0.015** (`Post: Create`) | Billed to the app's prepaid credits, per request; **$0.200 if the post contains a URL** — the connector routes URL posts to the priced `post_url` operation (TERMS); **URL posts are never free** |
| Platform (OutLayer) keep per curated-connector call | **$0.005** | $0.001 compute + $0.004 margin inside the $0.02 fee; #15 sponsor codes are the later lever to ~$0.001 |
| **App's net cost per sponsored text post** | **$0.02** | Fee −$0.02 (paid as caller) + author share +$0.015 (paid as author) + X bill −$0.015 = **−$0.02**. The author-share rebate only offsets X's bill — without the TERMS agreement the same post costs **$0.035**; without OutLayer, not possible at all (the enclave holds the credentials) |
| X API user read (`me`) | **$0.010/user read** | 24 h dedup per resource; the app caches the connected handle 7 days → **~$0.52/user/yr** for profile display |
| NEAR Social post | **~$0** | Gasless relay; user carries their own storage deposit |
| Annual cost of a maxed free tier (1 post/day) | **~$7.30/user** | Utilization-dependent; typical GM usage is at or under the cap |

Conclusion: X posting has a hard $0.015 floor set by X's published rate —
there is no shared post quota under pay-per-usage, cost recovery absolutely
sets the price floor, and the app gifts that cost deliberately (below).
NEAR Social posting is free for us. The blog is: **consumers are the
subsidized free engine, holders raise their own caps, agents are the
revenue, and the buyback converts that revenue into token price.**

## 2. The token (facts from the contract + launchpad)

- Contract: `xpost-1634.meme-cooking.near` — "open crosspost" (XPOST),
  **1,000,000,000 supply, 18 decimals**.
- Launchpad: meme.cooking — an **auction-based fair launch, NOT a bonding
  curve** (every depositor bought at one price; all NEAR deposited became a
  **locked** LP; token trades on Ref Finance). No per-trade creator fee
  exists — the platform takes nothing from trading.
- Pool state: **$10.316K locked liquidity, $12.011K market cap →
  XPOST ≈ $0.000012** (2026-10-31).
- Treasury started at **20% (200M XPOST)** and **grows** in v2: 20% of
  subscription revenue is spent buying XPOST weekly and the bought tokens
  return to the treasury — plus all tokens received as subscriptions paid
  in XPOST. Policy: treasury holds, never market-sells (showing the
  mechanism while it must also buy each week).

## 3. The consumer ladder — free to post, hold to post more

The gate (`connectors.outlayerCall`) still reads the session's NEAR account
balance; refusal is fail-closed and free. Every paid path is
wallet-anchored; anonymous sessions land at Tier 0 by construction; the
wallet prompt belongs at the point of wanting more, not at signup.

| Tier | Requirement | Gets | Our max cost/user/yr |
|---|---|---|---|
| Free | nothing | X connect + **1 text post/day** (app-paid), NEAR Social unlimited (~$0 to us), campaign browsing, BYO/fund-link path | $7.30 |
| Holder | hold ~100,000 XPOST (~$1.20) | **2/day** + auto-GM scheduler (#20) | $14.60 |
| Big holder | hold ~1,000,000 (~$12) | **5/day** + multi-destination | $36.50 |

Design notes:

- **The overflow valve IS the token** (replaces packs): want more than the
  free cap? Hold more XPOST. Usage demand converts directly into token
  demand — no checkout, no custodial funds, no pack UX.
- **Worst-case overrun is accepted marketing spend**: the hold is a
  one-time ~$1.20–$12 while the cost is recurring, so a fully-maxed
  tier always exceeds hold value at current price ($7.30–$36.50 actual
  worst cases above). Caps exist to bound it; observed GM utilization is
  ~1/day. Caps are env knobs, revisited with real usage data.
- **Threshold targets stay pinned to USD** (~$1.20 / ~$12) with the daily
  Ref-pool refresh already built (below §1a of v1, same mechanism):
  two free view calls, DB row → variable defaults, 24 h interval in
  plugin `initialize`, fail-safe keeps yesterday's row, ±25%/day drift cap.
- **Bounded free-op costs, always**: `delete` free ≤5/credential/day then
  at-cost ($0.011); `me` cached 7 days. Any newly free operation ships
  with its bound first.

## 4. The agent subscription (the revenue line)

API keys, agent campaigns (#B2: grants, per-post proofs), and the agent
rail are **paid, not held**. One launch shape:

> **$10/mo, priced in NEAR — 300 posts/mo included**
> **pay in XPOST and take 20% off**

- **No hold requirement** — anything else would shrink the buyer pool to
  speculators; B2 buyers get a flat, predictable price in the asset they
  already have.
- **The XPOST discount is the token's transactional reason** (the BNB
  pattern): a standing monthly budget that is 20% cheaper in XPOST. An
  agent paying in XPOST buys ~$8/month of the token, every month.
- **Economics per sub (NEAR-paid)**: $10 revenue; 300 posts × $0.02 =
  $6 cost; buyback takes $2 → **~$2 net/sub (~20%)**. XPOST-paid: the
  agent's ~$8 of XPOST goes to the treasury unswapped (pure net demand);
  post costs fund from the NEAR side.
- **Break-even on the free tier**: 100 free-tier users fully maxed (1/day)
  = 3,000 posts/mo = $60/mo → **~30 subs fund 100 daily free users
  entirely**. At typical utilization (~1/day is the cap itself — GM users
  are at or near it) plan like they are maxed.
- **XPOST received is treasuried, never swapped** — selling it would sell
  into the same pool the discount just bought from. Costs are funded by
  NEAR revenue; if NEAR inflows ever exceed needs, the existing 50/50
  hold/swap policy on pack inflows applies to the excess.
- **#15 sponsor codes** are the later margin lever: the platform's keep
  drops $0.004 → ~$0.001, cutting post cost to $0.016 and widening every
  margin above.

## 5. The buyback (the price engine)

A fixed **20% of NEAR revenue** buys XPOST on Ref weekly. Published txs;
policy change is a doc change first.

- **Why it works at this liquidity**: the pool is ~$10.3K locked — even
  **$50/week ≈ 1.3% of the pool**, visible sustained pressure. Revenue
  growth → weekly buying → price.
- **The holder story, honestly**: no lockups, no claims, no staking. You
  hold a token whose only job is to be needed (§3 caps, §4 discount) and
  whose revenue engine buys it every week (§5).
- **Bought tokens re-treasury** (decided 2026-11-02): they return to the
  treasury, which **never market-sells** — that is the difference between
  a buyback circulation and a circular wash. Future use of treasury XPOST
  (discount promos, grants) is a doc change too.
- The 200M founding treasury can **boost early buybacks** so the mechanism
  is visibly live from week one.
- **What died with the packs** (kept for the record): the 44%-over-compute
  pack line, the Tier-3 hold-gate on API keys, and pricing packs over raw
  compute or the (wrong) $0.005 net basis. Agent economics in v2 price
  over the true $0.02/post.

## 6. Revenue summary

1. **Session margin** (~20%/sub after costs and buyback) at $10/mo —
   30 subs ≈ break-even for 100 daily free users; every sub beyond is
   accretive.
2. **Buyback flywheel** — 20% of all NEAR revenue, weekly, on Ref.
3. **Treasury appreciation** — 200M+ XPOST held by a treasury that only
   ever buys; at $10.3K liquidity, product demand *is* the price mover.
4. Later: **sponsor codes** (#15) widen every margin.

## 7. Risk policies

- **URL posts are never surfaced as free** — $0.200 X cost routes to the
  priced `post_url` operation; the pre-submit link-surcharge notice shows
  it (open-crosspost/app#53).
- **Cap overhead**: worst case per holder is known, bounded, and accepted
  marketing spend, per §3; caps are env knobs reviewed monthly against
  observed utilization.
- **Fail-closed always**: gate or price-read failures refuse the dispatch
  before money moves; nothing is ever charged on a refusal; a downed app
  makes no X call and burns no credits.
- **X repricing risk**: pay-per-usage rates "are subject to change" —
  monitor the Usage API + Developer Console; reprice = one `set-prices`
  run + doc change (quarterly and on any rate announcement).
- **Free-operation griefing bounds**: capped deletes, cached `me`, since
  every free op is metered cash to the author's X credits.
- **Treasury rule**: treasury only buys. Buyback + XPOST-paid subs flow
  in; nothing flows out to the market. Changing this is the doc you would
  be reading.
- **Threshold staleness**: dynamic thresholds with daily refresh,
  fail-safe, ±25% drift cap (unchanged); USD targets reviewed quarterly.
