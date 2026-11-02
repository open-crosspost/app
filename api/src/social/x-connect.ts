import { randomUUID } from "node:crypto";
import { ORPCError } from "@orpc/server";
import type { PluginsClient } from "../lib/plugins-types.gen";
import { storeOutlayerSecretRows } from "./outlayer-secret-store";
import type { ConnectorCallFn } from "./scheduler";
import type { SocialConnectCallbackInput, SocialConnectCallbackResponse } from "./types";

export const X_OAUTH_SCOPES: string[] = [
  "offline.access",
  "tweet.read",
  "tweet.write",
  "users.read",
];

const PENDING_CONNECT_TTL_MS = 10 * 60 * 1000;
const DEFAULT_X_DAILY_POST_CAP = 1000;

export interface XClientCredentials {
  clientId?: string;
  clientSecret?: string;
  /** The connector project the handoff stores the credential row for. */
  project?: string;
  /**
   * The app's own OutLayer wallet key (wk_…). When set, the no-paste connect
   * path stores the caller's credential row on the app wallet — the app's
   * shared payment key pays for dispatch. BYO callers (who pass their own
   * wk_) bypass this.
   */
  appWalletKey?: string;
  /** The per-day post cap written into the stored credential row's policy. */
  maxPerDay?: number;
}

/**
 * OutLayer secret-row profiles admit letters, digits, `-` and `_` — no dots —
 * so a NEAR account id (`work.efiz.near`) is flattened deterministically.
 */
export const profileForUser = (key: string): string =>
  key.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64);

export const DEFAULT_X_CONNECT_PROJECT = "connectors.outlayer.near/x";

/** The twitter plugin's in-process client factory (v2 client-entry surface). */
export type TwitterPluginClient = NonNullable<PluginsClient["twitter"]>["client"];

interface PendingConnect {
  userId: string;
  codeVerifier: string;
  redirectUri: string;
  expiresAt: number;
}

type ExchangeAnswer = {
  id?: unknown;
  username?: unknown;
  granted_scope?: unknown;
  connect?: { X_REFRESH_TOKEN?: unknown } | null;
  "connect.X_REFRESH_TOKEN"?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

/**
 * The run answer reaches the API wrapped in OutLayer's run envelope
 * (`{ logs, operation, output, success }`); a bare answer is tolerated too.
 */
function extractExchangeAnswer(output: unknown): ExchangeAnswer | null {
  if (!output || typeof output !== "object") return null;
  const nested = (output as { output?: unknown }).output;
  if (nested && typeof nested === "object") return nested as ExchangeAnswer;
  return output as ExchangeAnswer;
}

/**
 * The minted refresh token reaches the run answer only under
 * `connect.X_REFRESH_TOKEN` — nested per the connector's answer, with the
 * flat dotted spelling tolerated.
 */
function readRefreshToken(answer: ExchangeAnswer | null): string | null {
  if (!answer) return null;
  const nested = asString(answer.connect?.X_REFRESH_TOKEN);
  return nested ?? asString(answer["connect.X_REFRESH_TOKEN"]);
}

const pendingConnects = new Map<string, PendingConnect>();

function pruneExpiredPendingConnects(now = Date.now()) {
  for (const [state, pending] of pendingConnects) {
    if (pending.expiresAt <= now) {
      pendingConnects.delete(state);
    }
  }
}

export interface XConnectStartInput {
  userId: string;
  redirectUri: string;
}

export interface XConnectStartResult {
  url: string;
  state: string;
}

export class XConnectFlow {
  constructor(
    private readonly twitter: TwitterPluginClient,
    private readonly credentials: XClientCredentials,
    private readonly dispatch?: ConnectorCallFn,
  ) {}

  get project(): string {
    return this.credentials.project ?? DEFAULT_X_CONNECT_PROJECT;
  }

  async start(input: XConnectStartInput): Promise<XConnectStartResult> {
    const state = randomUUID();
    const authLink = await this.twitter().auth.getAuthUrl({
      redirectUri: input.redirectUri,
      state,
      scopes: X_OAUTH_SCOPES,
    });

    if (!authLink.codeVerifier) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "X did not return a PKCE code verifier",
      });
    }

    pruneExpiredPendingConnects();
    pendingConnects.set(authLink.state, {
      userId: input.userId,
      codeVerifier: authLink.codeVerifier,
      redirectUri: input.redirectUri,
      expiresAt: Date.now() + PENDING_CONNECT_TTL_MS,
    });

    return { url: authLink.url, state: authLink.state };
  }

  async complete(
    input: SocialConnectCallbackInput & { userId: string; nearAccountId?: string },
  ): Promise<SocialConnectCallbackResponse> {
    pruneExpiredPendingConnects();
    const pending = pendingConnects.get(input.state);
    pendingConnects.delete(input.state);

    if (!pending || pending.userId !== input.userId) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Connection expired or invalid, please try again",
      });
    }

    const { clientId, clientSecret } = this.credentials;
    if (!clientId || !clientSecret) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "X client credentials are not configured",
      });
    }

    // Two credential shapes:
    //   BYO (walletApiKey passed, the advanced path) — both rows live under
    //     the caller's own wallet; the caller profile is the wallet's address.
    //   App-managed (default, no keys touched) — the caller's row lives on
    //     the APP wallet under the caller's flattened account id; the app's
    //     shared payment key pays for dispatch and resolves the row via
    //     secrets_ref. The author row (the OAuth client pair) is app-global:
    //     stored once per wallet, re-stored idempotently.
    const walletApiKey = input.walletApiKey ?? this.credentials.appWalletKey;
    if (!walletApiKey) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message:
          "The app OutLayer wallet is not configured (OUTLAYER_APP_WALLET_KEY) — keyless connect is unavailable",
      });
    }
    const callerProfile = input.walletApiKey
      ? ":owner:"
      : profileForUser(input.nearAccountId ?? input.userId);
    const policyJson = JSON.stringify({
      max_per_day: this.credentials.maxPerDay ?? DEFAULT_X_DAILY_POST_CAP,
    });

    // The author row lands before the run: the enclave's exchange_code reads
    // the OAuth client from it, under the curated X_OAUTH_* names.
    try {
      const stored = await storeOutlayerSecretRows({
        walletApiKey,
        project: this.project,
        rows: [
          {
            profile: "author",
            secrets: {
              X_OAUTH_CLIENT_ID: clientId,
              X_OAUTH_CLIENT_SECRET: clientSecret,
            },
          },
        ],
      });
      if (!stored) {
        throw new Error("the row store answered nothing");
      }
    } catch (error) {
      throw new ORPCError("BAD_GATEWAY", {
        message: `OutLayer did not store the X author credential: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }

    const exchanged = await this.runExchangeCode(input.code, pending);

    try {
      const stored = await storeOutlayerSecretRows({
        walletApiKey,
        project: this.project,
        rows: [
          {
            profile: callerProfile,
            secrets: {
              X_REFRESH_TOKEN: exchanged.refreshToken,
              X_POLICY: policyJson,
            },
          },
        ],
      });
      if (!stored) {
        throw new Error("the row store answered nothing");
      }
    } catch (error) {
      throw new ORPCError("BAD_GATEWAY", {
        message: `OutLayer did not store the X credential: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }

    return {
      status: "connected",
      scope: exchanged.grantedScope ?? X_OAUTH_SCOPES,
      xUserId: exchanged.xUserId,
      username: exchanged.username,
    };
  }

  /**
   * The enclave exchange: the code + PKCE verifier are exchanged with the
   * author client inside the connector's run — the API server never calls
   * X's token endpoint and never holds the client secret at exchange time.
   */
  private async runExchangeCode(
    code: string,
    pending: PendingConnect,
  ): Promise<{
    refreshToken: string;
    xUserId: string;
    username?: string;
    grantedScope?: string[];
  }> {
    if (!this.dispatch) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "The connectors bridge is not wired — the enclave code exchange is unavailable",
      });
    }

    const call = await this.dispatch({
      agentId: pending.userId,
      connector: this.project,
      operation: "exchange_code",
      input: {
        code,
        code_verifier: pending.codeVerifier,
        redirect_uri: pending.redirectUri,
      },
    });

    if (call.error) {
      throw new ORPCError("BAD_REQUEST", {
        message: call.error,
      });
    }
    if (call.status !== "completed") {
      throw new ORPCError("BAD_REQUEST", {
        message: `The enclave code exchange did not complete (status: ${call.status}, callId: ${call.callId})`,
      });
    }

    const answer = extractExchangeAnswer(call.output);
    const refreshToken = readRefreshToken(answer);
    if (!refreshToken) {
      throw new ORPCError("BAD_REQUEST", {
        message: "X did not grant a refresh token. Approve the offline.access scope and try again",
      });
    }

    const xUserId = asString(answer?.id);
    if (!xUserId) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "X did not return the connected user",
      });
    }

    const grantedScope = asString(answer?.granted_scope);
    return {
      refreshToken,
      xUserId,
      username: asString(answer?.username) ?? undefined,
      grantedScope: grantedScope?.split(" ").filter(Boolean),
    };
  }
}
