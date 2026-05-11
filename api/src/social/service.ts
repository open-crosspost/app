import { ORPCError } from "every-plugin/orpc";
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
  SocialMultiStatusData,
} from "./types";
import { ApiErrorCode, makeUnsupportedPlatformResult } from "./types";

function unavailableMessage(subject: string, action: string): string {
  return `${action} for ${subject} is not implemented yet.`;
}

export class SocialService {
  constructor(private readonly repository: SocialRepository) {}

  async ensureSchema(): Promise<void> {
    await this.repository.ensureSchema();
  }

  listAccounts(userId: string) {
    return this.repository.listAccounts(userId);
  }

  async connectAccount(
    _userId: string,
    input: SocialConnectAccountInput,
  ): Promise<SocialConnectAccountResponse> {
    return {
      status: "unavailable",
      message: unavailableMessage(input.platform, "account connection"),
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
