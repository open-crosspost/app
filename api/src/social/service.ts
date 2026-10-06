import { randomUUID } from "node:crypto";
import { ORPCError } from "every-plugin/orpc";
import type { PluginsClient } from "../lib/plugins-types.gen";
import type { SocialRepository } from "./repository";
import type {
  AccountPostsQuery,
  ActivityLeaderboardQuery,
  CreatePostRequest,
  DeletePostRequest,
  Platform,
  QuotePostRequest,
  ReplyToPostRequest,
  SocialAccountMutation,
  SocialActivityLeaderboardResponse,
  SocialConnectAccountInput,
  SocialConnectAccountResponse,
  SocialConnectCallbackInput,
  SocialConnectCallbackResponse,
  SocialMultiStatusData,
} from "./types";
import { ApiErrorCode, makeUnsupportedPlatformResult } from "./types";

const X_SCOPES = ["offline.access", "tweet.read", "tweet.write", "users.read"];
const PENDING_CONNECT_TTL_MS = 10 * 60 * 1000;
const OUTLAYER_AGENT_SECRET_URL = "https://api.outlayer.ai/wallet/v1/agent-secret";
const OUTLAYER_X_PROJECT = "connectors.outlayer.near/x";
const X_POLICY = JSON.stringify({ max_per_day: 10 });

interface PendingConnect {
  userId: string;
  codeVerifier: string;
  redirectUri: string;
  expiresAt: number;
}

const pendingConnects = new Map<string, PendingConnect>();

function prunePendingConnects(now = Date.now()) {
  for (const [state, pending] of pendingConnects) {
    if (pending.expiresAt <= now) {
      pendingConnects.delete(state);
    }
  }
}

function unavailableMessage(subject: string, action: string): string {
  return `${action} for ${subject} is not implemented yet.`;
}

export interface XClientCredentials {
  clientId?: string;
  clientSecret?: string;
}

export class SocialService {
  constructor(
    private readonly repository: SocialRepository,
    private readonly twitter?: PluginsClient["twitter"],
    private readonly xCredentials: XClientCredentials = {},
  ) {}

  async ensureSchema(): Promise<void> {
    await this.repository.ensureSchema();
  }

  listAccounts(userId: string) {
    return this.repository.listAccounts(userId);
  }

  async connectAccount(
    userId: string,
    input: SocialConnectAccountInput,
  ): Promise<SocialConnectAccountResponse> {
    if (input.platform !== "twitter" || !this.twitter) {
      return {
        status: "unavailable",
        message: unavailableMessage(input.platform, "account connection"),
      };
    }

    const authLink = await this.twitter().auth.getAuthUrl({
      redirectUri: input.redirectUri,
      state: randomUUID(),
      scopes: X_SCOPES,
    });

    if (!authLink.codeVerifier) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "X did not return a PKCE code verifier",
      });
    }

    prunePendingConnects();
    pendingConnects.set(authLink.state, {
      userId,
      codeVerifier: authLink.codeVerifier,
      redirectUri: input.redirectUri,
      expiresAt: Date.now() + PENDING_CONNECT_TTL_MS,
    });

    return {
      status: "redirect",
      url: authLink.url,
      state: authLink.state,
    };
  }

  async completeConnect(
    userId: string,
    input: SocialConnectCallbackInput,
  ): Promise<SocialConnectCallbackResponse> {
    if (input.platform !== "twitter" || !this.twitter) {
      throw new ORPCError("BAD_REQUEST", {
        message: unavailableMessage(input.platform, "account connection"),
      });
    }

    prunePendingConnects();
    const pending = pendingConnects.get(input.state);
    pendingConnects.delete(input.state);

    if (!pending || pending.userId !== userId) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Connection expired or invalid, please try again",
      });
    }

    const { clientId, clientSecret } = this.xCredentials;
    if (!clientId || !clientSecret) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "X client credentials are not configured",
      });
    }

    const token = await this.twitter().auth.exchangeCodeForToken({
      code: input.code,
      redirectUri: pending.redirectUri,
      codeVerifier: pending.codeVerifier,
      scopes: X_SCOPES,
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
          X_POLICY,
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
      scope: token.scope ?? X_SCOPES,
      xUserId: token.userId,
      username: token.username,
    };
  }

  async disconnectAccount(userId: string, input: SocialAccountMutation) {
    const deleted = await this.repository.deleteAccount(userId, input.platform, input.userId);

    if (!deleted) {
      throw new ORPCError("NOT_FOUND", {
        message: `${input.platform} account ${input.userId} was not found`,
      });
    }

    return {
      platform: input.platform,
      userId: input.userId,
    };
  }

  async refreshAccount(userId: string, input: SocialAccountMutation) {
    const account = await this.repository.touchAccount(userId, input.platform, input.userId);

    if (!account) {
      throw new ORPCError("NOT_FOUND", {
        message: `${input.platform} account ${input.userId} was not found`,
      });
    }

    return account;
  }

  async getAccountStatus(userId: string, input: SocialAccountMutation) {
    const account = await this.repository.getAccount(userId, input.platform, input.userId);
    const authenticated = !!account;

    return {
      platform: input.platform,
      userId: input.userId,
      authenticated,
      tokenStatus: {
        valid: authenticated,
        expired: false,
      },
    };
  }

  async createPost(userId: string, request: CreatePostRequest): Promise<SocialMultiStatusData> {
    return this.createUnsupportedPostResult(userId, request.targets, "posting");
  }

  async replyToPost(userId: string, request: ReplyToPostRequest): Promise<SocialMultiStatusData> {
    return this.createUnsupportedPostResult(userId, request.targets, "replies");
  }

  async quotePost(userId: string, request: QuotePostRequest): Promise<SocialMultiStatusData> {
    return this.createUnsupportedPostResult(userId, request.targets, "quotes");
  }

  async deletePost(userId: string, request: DeletePostRequest): Promise<SocialMultiStatusData> {
    const targets = request.posts.map((post) => ({
      platform: post.platform,
      userId: post.userId,
    }));

    return this.createUnsupportedPostResult(userId, targets, "post deletion");
  }

  getLeaderboard(query?: ActivityLeaderboardQuery): Promise<SocialActivityLeaderboardResponse> {
    return this.repository.getLeaderboard(query);
  }

  getAccountPosts(userId: string, query?: AccountPostsQuery) {
    return this.repository.listAccountPosts(userId, query);
  }

  private async createUnsupportedPostResult(
    userId: string,
    targets: Array<{ platform: Platform; userId: string }>,
    action: string,
  ): Promise<SocialMultiStatusData> {
    const connectedAccounts = await this.repository.listAccounts(userId);
    const connectedKeys = new Set(
      connectedAccounts.map((account) => `${account.platform}:${account.userId}`),
    );

    const errors = targets.map((target) => {
      const key = `${target.platform}:${target.userId}`;
      const isConnected = connectedKeys.has(key);

      return {
        code: isConnected ? ApiErrorCode.PLATFORM_UNAVAILABLE : ApiErrorCode.INVALID_REQUEST,
        message: isConnected
          ? unavailableMessage(target.platform, action)
          : `${target.platform} account ${target.userId} is not connected`,
        recoverable: false,
        details: {
          platform: target.platform,
          userId: target.userId,
        },
      };
    });

    return {
      ...makeUnsupportedPlatformResult(targets, unavailableMessage("Social posting", action)),
      summary: {
        total: targets.length,
        succeeded: 0,
        failed: errors.length,
      },
      errors,
    };
  }
}
