/** Sponsorship formatting for the "the app pays for this" surfaces. */

/** OutLayer compute micros ("1001") → a human USD string ("$0.001"). */
export function formatMicrosUsd(micros: string | null | undefined): string {
  const value = Number(micros ?? "0") / 1e6;
  if (!Number.isFinite(value) || value === 0) return "$0";
  if (value < 0.01) return `$${value.toFixed(4).replace(/0+$/, "")}`;
  if (value < 1) return `$${value.toFixed(3).replace(/0+$/, "")}`;
  return `$${value.toFixed(2)}`;
}

export function parseNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** yoctoNEAR string → human NEAR with 4 decimals. */
export function formatYoctoNear(yocto: string | null | undefined): string {
  if (!yocto) return "0";
  try {
    return (Number(BigInt(yocto)) / 1e24).toFixed(4);
  } catch {
    return "0";
  }
}
