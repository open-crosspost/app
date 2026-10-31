import { ORPCError } from "@orpc/server";

export type UpstreamError = ORPCError<
  "BAD_REQUEST" | "NOT_FOUND" | "CONNECTION_ERROR" | "INTERNAL_SERVER_ERROR",
  unknown
>;

export const mapUpstreamError =
  (what: string) =>
  (error: unknown): UpstreamError => {
    if (error instanceof ORPCError) return error as UpstreamError;
    const detail =
      error instanceof Error ? error.message : typeof error === "string" ? error : "unknown error";
    return new ORPCError("CONNECTION_ERROR", { message: `${what} failed: ${detail}` });
  };
