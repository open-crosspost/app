import { calculateRequiredDeposit, extractHashtags, extractMentions } from "near-social-js";
import { NETWORK_ID } from "@/config";
import type { AuthClient } from "@/lib/auth";

const SOCIAL_CONTRACT_ID = NETWORK_ID === "mainnet" ? "social.near" : "v1.social08.testnet";

type SocialStorageBalance = {
  available: string;
  total: string;
} | null;

export class NearSocialStorageRequiredError extends Error {
  readonly requiredDeposit: bigint;

  constructor(requiredDeposit: bigint) {
    super("NEAR Social storage is required before relayed posts can be sent.");
    this.name = "NearSocialStorageRequiredError";
    this.requiredDeposit = requiredDeposit;
  }
}

export function buildNearSocialPostData(
  accountId: string,
  text: string,
): Record<string, Record<string, unknown>> {
  const mentions = extractMentions(text);
  const hashtags = extractHashtags(text);
  const data: Record<string, Record<string, unknown>> = {
    [accountId]: {
      post: {
        main: JSON.stringify({ text, type: "md" }),
      },
      index: {
        post: JSON.stringify({
          key: "main",
          value: { type: "md" },
        }),
      },
    },
  };

  if (hashtags.length > 0) {
    const hashtagIndexes = hashtags.map((tag) => ({
      key: tag,
      value: {
        type: "hashtag",
        path: `${accountId}/post/main`,
      },
    }));

    data[accountId].index = {
      ...(data[accountId].index as Record<string, unknown>),
      hashtag: JSON.stringify(hashtagIndexes.length === 1 ? hashtagIndexes[0] : hashtagIndexes),
    };
  }

  for (const mentionedAccount of mentions) {
    if (mentionedAccount === accountId) continue;

    data[mentionedAccount] = {
      index: {
        notify: JSON.stringify({
          key: mentionedAccount,
          value: {
            type: "mention",
            accountId,
            item: {
              type: "social",
              path: `${accountId}/post/main`,
            },
          },
        }),
      },
    };
  }

  return data;
}

export async function postToNearSocial(
  near: AuthClient["near"],
  text: string,
): Promise<{ accountId: string; txHash: string }> {
  const connected = await near.ensureConnected();
  const accountId = near.getAccountId();
  if (!connected || !accountId) {
    throw new Error("NEAR wallet not connected. Connect your wallet first.");
  }

  const data = buildNearSocialPostData(accountId, text);
  const storageBalance = (
    await near.view({
      contractId: SOCIAL_CONTRACT_ID,
      methodName: "storage_balance_of",
      args: { account_id: accountId },
    })
  )?.data?.result as SocialStorageBalance;

  const requiredDeposit = BigInt(
    calculateRequiredDeposit({
      data,
      storageBalance: storageBalance
        ? {
            available: BigInt(storageBalance.available),
            total: BigInt(storageBalance.total),
          }
        : null,
    }).toFixed(),
  );

  if (requiredDeposit > 0n) {
    throw new NearSocialStorageRequiredError(requiredDeposit);
  }

  const relayerInfo = await near.getRelayerInfo({ network: NETWORK_ID });
  if (relayerInfo.error || !relayerInfo.data?.enabled) {
    throw new Error(
      relayerInfo.error?.message ||
        "NEAR relayer is not configured. Set NEAR_RELAYER_PRIVATE_KEY_MAINNET in .env (funded ed25519 key), restart bun run dev, then try again.",
    );
  }

  if (BigInt(relayerInfo.data.balance || "0") === 0n) {
    throw new Error(
      `NEAR relayer ${relayerInfo.data.accountId} has zero balance. Fund it with NEAR, then try again.`,
    );
  }

  const payload = await near.buildSignedDelegateAction(
    SOCIAL_CONTRACT_ID,
    (builder, receiverId) =>
      builder.functionCall(receiverId, "set", { data }, { gas: "100 Tgas", attachedDeposit: 0n }),
  );
  const relayed = await near.relayTransaction({ payload });
  if (relayed.error || !relayed.data?.txHash) {
    const message = relayed.error?.message || "NEAR relay failed.";
    if (/not configured|503|service unavailable/i.test(message)) {
      throw new Error(
        "NEAR relayer is not configured. Set NEAR_RELAYER_PRIVATE_KEY_MAINNET in .env (funded ed25519 key), restart bun run dev, then try again.",
      );
    }
    throw new Error(message);
  }

  return { accountId, txHash: relayed.data.txHash };
}
