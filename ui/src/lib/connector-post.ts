import {
  ApiErrorCode,
  type ErrorDetail,
  Platform,
  type SuccessDetail,
} from "@crosspost/plugin/types";
import type { ApiClient } from "@/app";
import { X_CONNECTOR_PROJECT } from "@/config";

export type ConnectorPostResult = { accountId: string; callId: string };

export async function postToX(
  apiClient: ApiClient,
  agentId: string,
  text: string,
): Promise<ConnectorPostResult> {
  const call = await apiClient.connectors.outlayerCall({
    agentId,
    connector: X_CONNECTOR_PROJECT,
    operation: "post",
    input: { text },
  });
  const output = call.output as { username?: string } | null;
  if (call.status !== "completed" || !output || !output.username) {
    throw new Error(call.error || "The connector did not publish the post.");
  }
  return { accountId: output.username, callId: call.callId };
}

export function connectorSuccessDetail(result: ConnectorPostResult, userId: string): SuccessDetail {
  return {
    platform: Platform.TWITTER,
    userId,
    status: "success",
    details: { message: `Posted to X as @${result.accountId}`, callId: result.callId },
  };
}

export function connectorErrorDetail(error: unknown, userId: string): ErrorDetail {
  return {
    message: error instanceof Error ? error.message : "Posting to X failed.",
    code: ApiErrorCode.PLATFORM_ERROR,
    recoverable: false,
    details: { platform: Platform.TWITTER, userId },
  };
}
