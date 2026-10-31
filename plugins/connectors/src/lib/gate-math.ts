/**
 * Pure price/threshold math for the XPOST admission gate — no Effect, no IO.
 * Every unit here is tested against real on-chain reserve figures.
 *
 * Token decimals on mainnet: XPOST 18 (FT standard), wNEAR 24, USDT 6.
 */

const WNEAR_DECIMALS = 24;
const USD_TOKEN_DECIMALS = 6;

/** Parse a CSV ladder/target list ("100000,1000000,10000000") into numbers; bad entries are dropped. */
export const parseCsvNumbers = (csv: string): number[] =>
  csv
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);

/**
 * NEAR price in USD from the deep wNEAR/USDT pool: (usdtRaw / 10^6) ÷
 * (wnearRaw / 10^24). Raw amounts are string-scale integers; float rounding
 * (~1e-16 relative) is irrelevant at threshold precision.
 */
export const usdPerNear = (usdtRaw: string | number, wnearRaw: string | number): number =>
  (Number(usdtRaw) / Number(wnearRaw)) * 10 ** (WNEAR_DECIMALS - USD_TOKEN_DECIMALS);

/** XPOST price in NEAR from the XPOST/wNEAR pool: (wnearRaw/10^24) ÷ (xpostRaw/10^18). */
export const nearPerXpost = (wnearRaw: string | number, xpostRaw: string | number): number =>
  (Number(wnearRaw) / Number(xpostRaw)) * 10 ** (18 - WNEAR_DECIMALS);

export const xpostPriceUsd = (nearPrice: number, usdPerNearPrice: number): number =>
  nearPrice * usdPerNearPrice;

/** Snap to the nearest {1, 2, 5} × 10ⁿ — pretty thresholds that read like a ladder. */
export const snapSignificant = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const exp = Math.floor(Math.log10(value));
  const base = 10 ** exp;
  const mantissa = value / base;
  let best = 1;
  for (const candidate of [1, 2, 5, 10]) {
    if (Math.abs(mantissa - candidate) < Math.abs(mantissa - best)) best = candidate;
  }
  return best * base;
};

/** USD targets → XPOST thresholds at the given spot price, snapped. */
export const tierThresholds = (targetsUsd: number[], priceUsd: number): number[] =>
  targetsUsd.map((target) => snapSignificant(target / priceUsd));

/**
 * Drift cap: a refreshed tier may move at most `pct` (0.25) from its previous
 * value — a pool wobble or single whale pump cannot reprice the ladder wildly.
 */
export const clampTiers = (computed: number[], previous: number[], pct = 0.25): number[] =>
  computed.map((value, index) => {
    const prev = previous[index];
    if (!Number.isFinite(prev) || prev === undefined || prev <= 0) return value;
    return Math.min(prev * (1 + pct), Math.max(prev * (1 - pct), value));
  });

/** 0..3: the highest tier whose raw threshold the raw balance meets. */
export const tierFor = (balanceRaw: bigint, decimals: number, thresholds: number[]): number => {
  for (let tier = thresholds.length; tier >= 1; tier--) {
    const threshold = thresholds[tier - 1];
    if (threshold === undefined || !Number.isFinite(threshold) || threshold <= 0) continue;
    if (balanceRaw >= BigInt(Math.ceil(threshold * 10 ** decimals))) return tier;
  }
  return 0;
};

export const toHumanUnits = (raw: bigint, decimals: number): string =>
  String(Number(raw) / 10 ** decimals);

/** Thresholds come out of snapSignificant as exact {1,2,5}×10ⁿ — print them plainly. */
export const formatThreshold = (value: number): string =>
  Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(6)));
