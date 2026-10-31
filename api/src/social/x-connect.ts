import { randomUUID } from "node:crypto";
import { ORPCError } from "@orpc/server";
import type { PluginsClient } from "../lib/plugins-types.gen";
import { storeOutlayerSecretRows } from "./outlayer-secret-store";
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

    const token = await this.twitter().auth.exchangeCodeForToken({
      code: input.code,
      redirectUri: pending.redirectUri,
      codeVerifier: pending.codeVerifier,
      scopes: X_OAUTH_SCOPES,
    });

    if (!token.refreshToken) {
      throw new ORPCError("BAD_REQUEST", {
        message: "X did not grant a refresh token. Approve the offline.access scope and try again",
      });
    }

    if (!token.userId) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "X did not return the connected user",
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

    try {
      const stored = await storeOutlayerSecretRows({
        walletApiKey,
        project: this.project,
        rows: [
          { profile: "author", secrets: { X_CLIENT_ID: clientId, X_CLIENT_SECRET: clientSecret } },
          {
            profile: callerProfile,
            secrets: {
              X_REFRESH_TOKEN: token.refreshToken,
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
      scope: token.scope ?? X_OAUTH_SCOPES,
      xUserId: token.userId,
      username: token.username,
    };
  }
}
