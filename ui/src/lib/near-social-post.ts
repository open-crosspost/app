import { NETWORK_ID } from "@/config";
import type { AuthClient } from "@/lib/auth";

/**
 * NEAR Social write path — the FastData KV standard (see
 * https://near.social/skill.md). Writes are plain function calls to
 * `__fastdata_kv` on the `social` account: no contract, no storage deposit,
 * gas as low as 1 Ggas. Mentions and hashtags are detected by the indexer —
 * nothing is embedded in the payload.
 */

const FASTDATA_KV_CONTRACT_ID = "social";
const INDEXER_BASE = "https://api2.near.social";

const RELAYER_UNAVAILABLE_MESSAGE = "Posting is temporarily unavailable. Please try again later.";
const WALLET_REQUIRED_MESSAGE = "Connect your NEAR wallet, then try again.";
const GENERIC_POST_ERROR_MESSAGE = "Something went wrong while posting. Please try again.";
const MAINNET_ONLY_MESSAGE = "NEAR Social posting is available on mainnet only.";

export function toNearSocialUserError(error: unknown): string {
  const message = error instanceof Error ? error.message.trim() : "";
  if (!message) {
    return GENERIC_POST_ERROR_MESSAGE;
  }

  if (/wallet not connected|connect your wallet/i.test(message)) {
    return WALLET_REQUIRED_MESSAGE;
  }

  if (/mainnet only/i.test(message)) {
    return MAINNET_ONLY_MESSAGE;
  }

  if (
    /relayer|not configured|503|service unavailable|private.?key|\.env|bun run|zero balance|fund it/i.test(
      message,
    )
  ) {
    return RELAYER_UNAVAILABLE_MESSAGE;
  }

  if (/failed|unavailable|try again/i.test(message) && !/[A-Z_]{6,}|ed25519|\.env/.test(message)) {
    return message;
  }

  return GENERIC_POST_ERROR_MESSAGE;
}

export function buildFastDataKvArgs(text: string): Record<string, { text: string }> {
  return { [`post/${Date.now()}`]: { text } };
}

type IndexerTxStatus = {
  indexed?: boolean;
  actions?: Array<{ status?: string; keys?: Array<{ status?: string; reason?: string }> }>;
};

/**
 * `social` has no contract, so the transaction always reports
 * `CodeDoesNotExist` even when the write is accepted — the indexer, not the
 * receipt, is the source of truth. Polls briefly and throws if a key was
 * rejected (invalid value, rate limit); "pending" just means indexing hasn't
 * landed yet within the poll window.
 */
async function verifyIndexed(txHash: string): Promise<"ok" | "pending"> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    let status: IndexerTxStatus;
    try {
      const response = await fetch(`${INDEXER_BASE}/v1/tx/${txHash}`);
      if (!response.ok) continue;
      status = (await response.json()) as IndexerTxStatus;
    } catch {
      continue;
    }

    if (!status.indexed) continue;

    const keyStatuses = (status.actions ?? []).flatMap((action) => action.keys ?? []);
    const rejected = keyStatuses.find((key) => key.status && key.status !== "ok");
    if (rejected) {
      throw new Error(rejected.reason || `Write rejected (${rejected.status}).`);
    }
    if (keyStatuses.length > 0) return "ok";
  }
  return "pending";
}

export async function postToNearSocial(
  near: AuthClient["near"],
  text: string,
): Promise<{ accountId: string; txHash: string }> {
  if (NETWORK_ID !== "mainnet") {
    throw new Error(MAINNET_ONLY_MESSAGE);
  }

  const connected = await near.ensureConnected();
  const accountId = near.getAccountId();
  if (!connected || !accountId) {
    throw new Error(WALLET_REQUIRED_MESSAGE);
  }

  const relayerInfo = await near.getRelayerInfo({ network: NETWORK_ID });
  if (relayerInfo.error || !relayerInfo.data?.enabled) {
    throw new Error(RELAYER_UNAVAILABLE_MESSAGE);
  }

  if (BigInt(relayerInfo.data.balance || "0") === 0n) {
    throw new Error(RELAYER_UNAVAILABLE_MESSAGE);
  }

  const args = buildFastDataKvArgs(text);
  const payload = await near.buildSignedDelegateAction(
    FASTDATA_KV_CONTRACT_ID,
    (builder, receiverId) =>
      builder.functionCall(receiverId, "__fastdata_kv", args, {
        gas: "0.001 Tgas",
        attachedDeposit: 0n,
      }),
  );
  const relayed = await near.relayTransaction({ payload });

  const txHash = relayed.data?.txHash;
  if (!txHash) {
    const message = relayed.error?.message || "";
    if (/not configured|503|service unavailable|relayer|private.?key/i.test(message) || !message) {
      throw new Error(RELAYER_UNAVAILABLE_MESSAGE);
    }
    throw new Error(GENERIC_POST_ERROR_MESSAGE);
  }

  await verifyIndexed(txHash);
  return { accountId, txHash };
}
