# TERMS — the x connector on mainnet (DRAFT for agreement)

Everything the review asked us to settle "before we turn it on": the
operation prices, the author share, and what happens if the X app is ever
rotated or revoked. Numbers marked **[proposed]** are our opening position;
everything here needs the platform's sign-off before activation.

> Pricing basis: X API **pay-per-usage** (no subscriptions), rates published
> at docs.x.com/x-api/getting-started/pricing and verified 2026-11-02. Every
> rate below decomposes as: **X unit cost + $0.001 OutLayer compute +
> platform margin**. The author share is itemized pass-through — exactly
> X's published unit cost — not basis points sized from a monthly allocation.

## Who carries what

| party | carries |
|---|---|
| the connector author (open-crosspost) | the X app: its client id/secret live in the author row (`profile: author`, stored by the publishing account); X's API bill for **every write any agent makes through any connected account** (metered per request, prepaid credits); the app's compliance (developer agreement, callback URIs, scope set) |
| the platform (OutLayer) | the enclave, the coordinator's charging and the price table's enforcement, the connect handoff (#18) |
| the owner | their credential row and policy; the per-call fee, paid by the agent's payment key |
| the calling agent | the fee for every operation it asks for, reads included when priced |

The cost asymmetry is the crux, and pay-per-usage sharpens it: fees are
collected per call, but X bills the **app's prepaid credit balance** for
every request regardless of whether a fee was charged. There is no write
quota to amortize anymore — every free operation is a direct cash loss to
the author. The author share exists to cover exactly that, per operation,
from X's published constants.

## Operation prices (v2 — itemized pass-through)

Set by `x/set-prices.sh`; must always equal the manifest's operation list.
**The manifest gains one operation: `post_url`** (below).

| operation | X bills the app | fee [proposed] | author share | rationale |
|---|---|---|---|---|
| `status` | $0 (no X call) | free | — | an agent sees its own limits before spending anything |
| `me` | $0.010 per user read (24 h dedup, per resource) | free | — | the connected handle before spending; hard-cached 7 days server-side (v2 policy, TOKENOMICS §1) — cache plus dedup bounds the author's exposure at $0.010/user/active-day, ~$0.52/user/yr |
| `post` (text only) | $0.015 (Post: Create) | **$0.02** | $0.015 | X's unit cost + compute + margin |
| `post_url` (contains a link) | **$0.200** (Post: Create with URL) | **$0.21** | $0.200 | a single price for `post` cannot survive X's per-endpoint billing; the connector detects URLs and routes here |
| `retweet` | $0.015 (User Interaction: Create) **[confirm endpoint class in Developer Console]** | **$0.02** | $0.015 | feed output like a post, counted in the same daily cap |
| `unretweet` | $0.005 (Content: Manage) **[confirm]** | **$0.006** | $0.005 | priced **at cost, zero margin** — removal is not output; the safety direction never earns, it only covers |
| `delete` | $0.010 (Interaction: Delete) | **free ≤ 5/credential/day, then $0.011** | $0.010 beyond cap | capped-free: the safety direction stays unpriced for legitimate use, and a free delete is otherwise a **griefing vector on the author's credit balance** (an agent posting 100× and deleting 100× burns $2.50 of X credits while paying $2.00 in fees) |
| `confirm` | $0 | free | — | the action was paid for when the agent made the task |
| `task_status`, `tasks` | $0 | free | — | asking where a task stands is not output |
| `task_cancel`, `task_delete`, `tasks_unlock` | $0 | free | — | housekeeping |

Notes:

- **Free loses nothing at X; free is not free.** `me` and the free writes
  are bounded, itemized exposure lines, not zero-cost lines. Caps and
  caches are their only protection.
- **X prices are subject to change.** The review trigger is X's repricing
  (monitored via their Usage API and Developer Console rates); repricing
  the connector is one `set-prices.sh` run — a config change, not code.
- Failed or refused runs make no X call and charge nothing (below).

## The author share

Replaces the earlier 0 bp arrangement and the three-option proposal. The
share is **X's published unit cost, per operation**, carried as part of the
fee split — the author receives exactly what X bills the app for that
request and no more (break-even by design; an author margin on top is a
later negotiation at scale):

```
fee = X unit cost + $0.001 (OutLayer compute) + platform margin
author share = X unit cost
```

| op | fee | author share | platform keeps |
|---|---|---|---|
| `post` | $0.02 | $0.015 | $0.005 ($0.001 compute + $0.004 margin) |
| `post_url` | $0.21 | $0.200 | $0.010 ($0.001 compute + $0.009 margin) |
| `retweet` | $0.02 | $0.015 | $0.005 |
| `unretweet` / `delete` (beyond cap) | at cost | at cost−compute | $0.001 |

Why this shape, and why the bp proposal is gone: under pay-per-usage the
per-write cost is a **published constant**, so position 2's machinery
(monthly tier allocation, bp sized against volume, the platform sharing
usage readouts, quarterly recalibration) has nothing to allocate. Itemized
pass-through needs no readout dependency, no runtime oracle, and no
utilization review — it aligns with the platform's no-oracle-at-dispatch
philosophy. For the author's own app-paid traffic the share is a
self-rebate that **exactly offsets X's bill**: the ledger per post is
fee −$0.02 (paid as caller) + share +$0.015 (paid as author) + X −$0.015
= **−$0.02 net** (X's unit cost + the platform's keep). Without the share
the same post would cost −$0.035 — the share is worth $0.015/post to the
app — and a #15 sponsor-code program rate (compute + margin as the fee,
X billed directly) lands on the same −$0.02. Third-party agent traffic
then covers its own X cost exactly: curated adoption stops subsidizing
the app's COGS.

**Open items for the platform:**

1. Per-operation **absolute** author shares (not bp of the fee). If the
   coordinator supports bp only, the equivalents are: `post` 7500 bp,
   `post_url` ~9520 bp, `retweet` 7500 bp, `unretweet` ~8333 bp,
   `delete` ~9091 bp — but absolute amounts survive X repricing more
   legibly.
2. Manifest growth: `post_url` joins the operation list; the price table
   and manifest stay in lockstep per review.
3. Platform margin per operation: $0.004/write class proposed above;
   the platform's number is welcome.

## If the X app is rotated or revoked

What breaks, in order:

* **Client secret rotated** (or the app's user-auth settings changed): every
  run using the author client is refused `credential_rejected`
  (invalid_client) at the next refresh — page-connected accounts stop
  working at once. An owner who brought their OWN OAuth app keeps working:
  theirs wins by design, nothing of ours enters their run.
* **App revoked / suspended**: same refusal shape; additionally X may void
  the refresh tokens minted by it. Same refusal, terminal, owner reconnects
  — but there is nothing to reconnect TO until a live app is in the author
  row.

Mitigations to agree before launch:

1. **The runbook step is one `outlayer secrets set`** — a new client pair
   into the author row is live on the next run; no redeploy, no re-consent
   (the refresh tokens survive a secret rotation; they do not survive an
   app revocation). `docs/` gains the exact steps and who is paged.
2. **A rotation drill on testnet** before mainnet activation: rotate the
   secret, confirm the refusal shape, restore, confirm recovery.
3. **An owner-comms template**: what a page-connected owner sees
   (`credential_rejected` / `credential_expired` naming the connect page),
   and what they must do (nothing, or reconnect, per case).
4. **Fee handling while down**: an operation refused pre-run costs nothing
   already; a post refused at the refresh costs nothing (the fee is charged
   for runs, and a `credential_*` refusal is terminal — [confirm with the
   platform that no fee is charged on a terminal refusal]). X bills nothing
   for a request never made, so a downed app accrues no credit burn.

## Open questions for the negotiation

1. **Author share mechanics** (new): absolute per-operation amounts vs bp
   equivalents — item 1 above; and the platform margin per operation.
2. **`post_url` in the manifest** (new): acceptance of the new operation.
3. The connect-page route (ticket #18): the platform's page routes
   `connect.X_REFRESH_TOKEN` into the owner's row — confirm the mechanism,
   and that the exchange run is priced free (like `status`/`me`).
   (The open-crosspost app's own connect flow calls the same operation and
   writes the row itself, ECIES; tracked as open-crosspost/app#52.)
4. Does the coordinator charge any fee on a terminal (`credential_*`)
   refusal? The README's fee story depends on the answer; TOKENOMICS §7
   already commits to fail-closed-and-free as policy.
5. Storage scoped to the credential's row (shared lineage + per-account
   policy cap): the connector is ready for it; when does the platform ship
   it?
6. Confirm the exact X endpoint classes for `retweet`, `unretweet`, and
   `delete` against the Developer Console (rates above are from the
   published pricing page).
