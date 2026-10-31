export const XPOST_BUY_URL = "https://meme.cooking/meme/1634";

/** The editor panel that carries the sponsored-posting guard visuals. */
export const XPOST_GUARD_ANCHOR_ID = "xpost-gate-guard";

export type GateRefusalReason = "no_near_account" | "balance_too_low";

export interface GateRefusalData {
  reason: GateRefusalReason;
  minimum: string;
  balance: string | null;
  buyUrl: string;
}

/**
 * Pull a structured XPOST gate refusal out of a rejected oRPC call — the
 * connectors contract throws ORPCError("GATE_REFUSED") with a typed payload.
 */
export function extractGateRefusal(error: unknown): GateRefusalData | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as { code?: unknown; data?: unknown };
  if (candidate.code !== "GATE_REFUSED" || !candidate.data) return null;
  const data = candidate.data as Record<string, unknown>;
  if (data.reason !== "no_near_account" && data.reason !== "balance_too_low") return null;
  if (typeof data.minimum !== "string") return null;
  return {
    reason: data.reason,
    minimum: data.minimum,
    balance: typeof data.balance === "string" ? data.balance : null,
    buyUrl: typeof data.buyUrl === "string" ? data.buyUrl : XPOST_BUY_URL,
  };
}
