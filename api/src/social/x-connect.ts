import { randomUUID } from "node:crypto";
import { ORPCError } from "every-plugin/orpc";
import type { PluginsClient } from "../lib/plugins-types.gen";
import type { SocialConnectCallbackInput, SocialConnectCallbackResponse } from "./types";

export const X_OAUTH_SCOPES: string[] = [
  "offline.access",
  "tweet.read",
  "tweet.write",
  "users.read",
];

const PENDING_CONNECT_TTL_MS = 10 * 60 * 1000;
const OUTLAYER_AGENT_SECRET_URL = "https://api.outlayer.ai/wallet/v1/agent-secret";
const OUTLAYER_X_PROJECT = "connectors.outlayer.near/x";
const DEFAULT_X_DAILY_POST_CAP = 10;
const DEFAULT_X_POLICY_JSON = JSON.stringify({ max_per_day: DEFAULT_X_DAILY_POST_CAP });

export interface XClientCredentials {
  clientId?: string;
  clientSecret?: string;
}

export type TwitterPluginClient = NonNullable<PluginsClient["twitter"]>;

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
    private readonly twitter: NonNullable<PluginsClient["twitter"]>,
    private readonly credentials: XClientCredentials,
  ) {}

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
    input: SocialConnectCallbackInput & { userId: string },
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

    const response = await fetch(OUTLAYER_AGENT_SECRET_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.walletApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        project: OUTLAYER_X_PROJECT,
        secrets: {
          X_REFRESH_TOKEN: token.refreshToken,
          X_CLIENT_ID: clientId,
          X_CLIENT_SECRET: clientSecret,
          X_POLICY: DEFAULT_X_POLICY_JSON,
        },
      }),
    });

    if (!response.ok) {
      throw new ORPCError("BAD_GATEWAY", {
        message: `OutLayer did not store the X credential (HTTP ${response.status})`,
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
