import {
  ApiErrorCode,
  type ConnectedAccount,
  type ErrorDetail,
  Platform,
  type SuccessDetail,
} from "@crosspost/plugin/types";
import type { ApiClient } from "@/app";
import { X_CONNECTOR_PROJECT } from "@/config";
import { formatMicrosUsd } from "@/lib/sponsor";

export type ConnectorPostResult = {
  callId: string;
  tweetUrl: string | null;
  computeCost: string | null;
};

type XPostPayload = {
  tweet_id?: unknown;
  url?: unknown;
  username?: unknown;
};

type XConnectorOutput = {
  success?: unknown;
  output?: XPostPayload | null;
  username?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

/**
 * The curated X connector wraps its result: `{ success, output: { tweet_id,
 * url, ... } }`. OutLayer stdout is freeform, so also tolerate the payload
 * arriving flat at the top level.
 */
function extractPayload(output: XConnectorOutput | null): XPostPayload | null {
  if (!output || typeof output !== "object") return null;
  if (output.output && typeof output.output === "object") return output.output;
  return output;
}

export function parseConnectorOutcome(call: {
  callId: string;
  status: string;
  output: unknown;
  error: string | null;
  [key: string]: unknown;
}): { callId: string; tweetUrl: string | null } {
  const output = (call.output ?? null) as XConnectorOutput | null;
  const payload = extractPayload(output);
  const tweetUrl = asString(payload?.url);
  const published =
    call.status === "completed" &&
    output?.success !== false &&
    (tweetUrl !== null ||
      asString(payload?.tweet_id) !== null ||
      asString(output?.username) !== null);

  if (call.error) {
    throw new Error(`${call.error} (status: ${call.status || "unknown"}, callId: ${call.callId})`);
  }
  if (!published) {
    throw new Error(
      `The connector did not publish the post (status: ${call.status || "unknown"}, callId: ${call.callId}).`,
    );
  }
  return { callId: call.callId, tweetUrl };
}

export async function postToX(
  apiClient: ApiClient,
  agentId: string,
  text: string,
  replyTo?: string,
): Promise<ConnectorPostResult> {
  const call = await apiClient.connectors.outlayerCall({
    agentId,
    connector: X_CONNECTOR_PROJECT,
    operation: "post",
    input: replyTo ? { text, reply_to: replyTo } : { text },
  });
  const outcome = parseConnectorOutcome(call);
  return { ...outcome, computeCost: call.computeCost ?? null };
}

export function connectorSuccessDetail(
  result: ConnectorPostResult,
  account: ConnectedAccount,
): SuccessDetail {
  const handle = account.profile?.username || account.userId;
  const base = result.tweetUrl
    ? `Posted to X as @${handle} — ${result.tweetUrl}`
    : `Posted to X as @${handle}`;
  const cost = result.computeCost ? formatMicrosUsd(result.computeCost) : null;
  return {
    platform: Platform.TWITTER,
    userId: account.userId,
    status: "success",
    details: {
      message: cost ? `${base} — Sponsored by OpenCrosspost (≈${cost})` : base,
      callId: result.callId,
    },
  };
}

export function connectorErrorDetail(error: unknown, account: ConnectedAccount): ErrorDetail {
  return {
    message: error instanceof Error ? error.message : "Posting to X failed.",
    code: ApiErrorCode.PLATFORM_ERROR,
    recoverable: false,
    details: { platform: Platform.TWITTER, userId: account.userId },
  };
}
