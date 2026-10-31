import { Effect } from "effect";

/**
 * Sponsor-wallet reads for the admin dashboard: the NEAR balance of the app's
 * shared OutLayer payment-key owner (an implicit custody account) and a
 * best-effort remaining-USD read from the OutLayer API. Both degrade to null
 * on failure — the dashboard renders "unreadable" rather than guessing.
 */

const YOCTO_PER_NEAR = 10 ** 24;

const fetchJson = async (url: string, init?: RequestInit): Promise<unknown> => {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
};

export const viewAccountBalance = (
  rpcUrl: string,
  accountId: string,
): Effect.Effect<string | null, never> =>
  Effect.tryPromise({
    try: async () => {
      const body = (await fetchJson(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "sponsor",
          method: "query",
          params: {
            request_type: "view_account",
            account_id: accountId,
            finality: "optimistic",
          },
        }),
      })) as { error?: { message?: string }; result?: { amount?: string | number } };
      if (body.error) throw new Error(body.error.message);
      const amount = body.result?.amount;
      if (amount === undefined || amount === null) throw new Error("no amount");
      return String(amount);
    },
    catch: (cause) => new Error("view_account read failed", { cause }),
  }).pipe(Effect.orElseSucceed(() => null));

export const yoctoToNear = (yocto: string): string =>
  (Number(BigInt(yocto)) / YOCTO_PER_NEAR).toFixed(5);

export const outlayerKeyRemainingUsd = (
  outlayerApiUrl: string,
  appPaymentKey: string,
): Effect.Effect<string | null, never> =>
  Effect.tryPromise({
    try: async () => {
      const body = (await fetchJson(`${outlayerApiUrl}/wallet/v1/balance`, {
        headers: { Authorization: `Bearer ${appPaymentKey}` },
      })) as unknown;
      if (!body || typeof body !== "object") throw new Error("unexpected balance shape");
      const record = body as Record<string, unknown>;
      for (const field of ["remaining_usd", "balance_remaining_usd", "balance_usd", "balance"]) {
        const value = record[field];
        if (typeof value === "string" && value.length > 0) return value;
        if (typeof value === "number" && Number.isFinite(value)) return String(value);
      }
      throw new Error("no balance field");
    },
    catch: (cause) => new Error("outlayer balance read failed", { cause }),
  }).pipe(Effect.orElseSucceed(() => null));
