import { describe, expect, it } from "vitest";
import {
  clampTiers,
  formatThreshold,
  nearPerXpost,
  parseCsvNumbers,
  snapSignificant,
  tierFor,
  tierThresholds,
  toHumanUnits,
  usdPerNear,
  xpostPriceUsd,
} from "../../src/lib/gate-math";

/**
 * Reserve figures are the real on-chain numbers (2026-10-31):
 * Ref pool 6055 (XPOST/wNEAR) and pool 6063 (wNEAR/USDT).
 */
const XPOST_RAW = "429447747565504826319035822";
const WNEAR_XPOOL_RAW = "1141253874852192121438445978";
const WNEAR_USDPOOL_RAW = "44538119249131654286979991715";
const USDT_RAW = "191062475812";

describe("gate math (real pool 6055/6063 reserves)", () => {
  it("prices NEAR in USD from the deep wNEAR/USDT leg", () => {
    const usd = usdPerNear(USDT_RAW, WNEAR_USDPOOL_RAW);
    expect(usd).toBeGreaterThan(4.0);
    expect(usd).toBeLessThan(4.6);
  });

  it("prices XPOST in NEAR from the XPOST/wNEAR pool", () => {
    const near = nearPerXpost(WNEAR_XPOOL_RAW, XPOST_RAW);
    expect(near).toBeGreaterThan(2.0e-6);
    expect(near).toBeLessThan(3.2e-6);
  });

  it("combines both legs into a USD price near the measured $0.0000114", () => {
    const price = xpostPriceUsd(
      nearPerXpost(WNEAR_XPOOL_RAW, XPOST_RAW),
      usdPerNear(USDT_RAW, WNEAR_USDPOOL_RAW),
    );
    expect(price).toBeGreaterThan(1.0e-5);
    expect(price).toBeLessThan(1.3e-5);
  });

  it("snapping today's USD targets onto today's price reproduces the 100k/1M/10M ladder", () => {
    const price = xpostPriceUsd(
      nearPerXpost(WNEAR_XPOOL_RAW, XPOST_RAW),
      usdPerNear(USDT_RAW, WNEAR_USDPOOL_RAW),
    );
    expect(tierThresholds([1.2, 12, 120], price)).toEqual([100000, 1000000, 10000000]);
  });
});

describe("snapSignificant", () => {
  it.each([
    [105237, 100000],
    [999999, 1000000],
    [12345, 10000],
    [250000, 200000],
    [0.5, 0.5],
    [0, 0],
    [-3, 0],
  ])("snaps %d to %d", (input, expected) => {
    expect(snapSignificant(input)).toBe(expected);
  });
});

describe("clampTiers (±25%/day drift cap)", () => {
  it("lets small moves through untouched", () => {
    expect(clampTiers([104000, 1040000, 10400000], [100000, 1000000, 10000000])).toEqual([
      104000, 1040000, 10400000,
    ]);
  });

  it("clamps large moves to the previous value ±25%", () => {
    expect(clampTiers([200000, 100, 500], [100000, 1000000, 10000000])).toEqual([
      125000, 750000, 7500000,
    ]);
  });

  it("keeps the computed value when there is no previous ladder", () => {
    expect(clampTiers([100000, 1000000, 10000000], [])).toEqual([100000, 1000000, 10000000]);
  });
});

describe("tierFor / toHumanUnits", () => {
  const ladder = [2, 20, 200];

  it("resolves the highest tier whose threshold the balance meets", () => {
    expect(tierFor(5n * 10n ** 18n, 18, ladder)).toBe(1);
    expect(tierFor(50n * 10n ** 18n, 18, ladder)).toBe(2);
    expect(tierFor(250n * 10n ** 18n, 18, ladder)).toBe(3);
    expect(tierFor(1n * 10n ** 18n, 18, ladder)).toBe(0);
  });

  it("renders human units", () => {
    expect(toHumanUnits(500n * 10n ** 18n, 18)).toBe("500");
  });
});

describe("parsing and formatting", () => {
  it("parses a CSV ladder tolerantly", () => {
    expect(parseCsvNumbers("100000,1000000,10000000")).toEqual([100000, 1000000, 10000000]);
    expect(parseCsvNumbers("1.2, 12 ,120, oops")).toEqual([1.2, 12, 120]);
  });

  it("formats snapped thresholds plainly", () => {
    expect(formatThreshold(100000)).toBe("100000");
    expect(formatThreshold(2.5)).toBe("2.5");
  });
});
