import { calculateRequiredDeposit, extractHashtags, extractMentions } from "near-social-js";
import { NETWORK_ID } from "@/config";
import type { AuthClient } from "@/lib/auth";

const SOCIAL_CONTRACT_ID = NETWORK_ID === "mainnet" ? "social.near" : "v1.social08.testnet";

type SocialStorageBalance = {
  available: string;
  total: string;
} | null;

const RELAYER_UNAVAILABLE_MESSAGE = "Posting is temporarily unavailable. Please try again later.";
const WALLET_REQUIRED_MESSAGE = "Connect your NEAR wallet, then try again.";
const STORAGE_REQUIRED_MESSAGE =
  "Your Near Social account needs a small storage deposit before you can post.";
const GENERIC_POST_ERROR_MESSAGE = "Something went wrong while posting. Please try again.";

export class NearSocialStorageRequiredError extends Error {
  readonly requiredDeposit: bigint;

  constructor(requiredDeposit: bigint) {
    super(STORAGE_REQUIRED_MESSAGE);
    this.name = "NearSocialStorageRequiredError";
    this.requiredDeposit = requiredDeposit;
  }
}

export function toNearSocialUserError(error: unknown): string {
  if (error instanceof NearSocialStorageRequiredError) {
    return STORAGE_REQUIRED_MESSAGE;
  }

  const message = error instanceof Error ? error.message.trim() : "";
  if (!message) {
    return GENERIC_POST_ERROR_MESSAGE;
  }

  if (/wallet not connected|connect your wallet/i.test(message)) {
    return WALLET_REQUIRED_MESSAGE;
  }

  if (
    /relayer|not configured|503|service unavailable|private.?key|\.env|bun run|zero balance|fund it/i.test(
      message,
    )
  ) {
    return RELAYER_UNAVAILABLE_MESSAGE;
  }

  if (/storage is required|storage deposit/i.test(message)) {
    return STORAGE_REQUIRED_MESSAGE;
  }

  if (/failed|unavailable|try again/i.test(message) && !/[A-Z_]{6,}|ed25519|\.env/.test(message)) {
    return message;
  }

  return GENERIC_POST_ERROR_MESSAGE;
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
    throw new Error(WALLET_REQUIRED_MESSAGE);
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
    throw new Error(RELAYER_UNAVAILABLE_MESSAGE);
  }

  if (BigInt(relayerInfo.data.balance || "0") === 0n) {
    throw new Error(RELAYER_UNAVAILABLE_MESSAGE);
  }

  const payload = await near.buildSignedDelegateAction(SOCIAL_CONTRACT_ID, (builder, receiverId) =>
    builder.functionCall(receiverId, "set", { data }, { gas: "100 Tgas", attachedDeposit: 0n }),
  );
  const relayed = await near.relayTransaction({ payload });
  if (relayed.error || !relayed.data?.txHash) {
    const message = relayed.error?.message || "";
    if (/not configured|503|service unavailable|relayer|private.?key/i.test(message) || !message) {
      throw new Error(RELAYER_UNAVAILABLE_MESSAGE);
    }
    throw new Error(GENERIC_POST_ERROR_MESSAGE);
  }

  return { accountId, txHash: relayed.data.txHash };
}
