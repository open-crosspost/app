import { ORPCError } from "@orpc/server";
import { CampaignRepository } from "./campaign-repository";
import type { SocialRepository } from "./repository";
import type {
  AccountPostsQuery,
  ActivityLeaderboardQuery,
  Campaign,
  CreateCampaign,
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
  UpdateCampaign,
} from "./types";
import { ApiErrorCode, makeUnsupportedPlatformResult } from "./types";
import {
  profileForUser,
  type TwitterPluginClient,
  type XClientCredentials,
  XConnectFlow,
} from "./x-connect";

function unavailableMessage(subject: string, action: string): string {
  return `${action} for ${subject} is not implemented yet.`;
}

export class SocialService {
  private twitterFactory?: TwitterPluginClient;
  private connectorsFactory?: (userId: string) => unknown;
  private readonly xCredentials: XClientCredentials;
  private readonly campaignRepository: CampaignRepository;

  constructor(
    private readonly repository: SocialRepository,
    xCredentials: XClientCredentials = {},
    campaignRepository?: CampaignRepository,
  ) {
    this.xCredentials = xCredentials;
    this.campaignRepository = campaignRepository ?? new CampaignRepository(repository.database);
  }

  async listActiveCampaigns(): Promise<Campaign[]> {
    return this.campaignRepository.listActive();
  }

  ensureCampaignSchema(): Promise<void> {
    return this.campaignRepository.ensureSchema();
  }

  async getCampaign(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.get(id);
    if (!campaign) {
      throw new ORPCError("NOT_FOUND", { message: `Campaign ${id} not found` });
    }
    return campaign;
  }

  async createCampaign(userId: string, input: CreateCampaign): Promise<Campaign> {
    const existing = await this.campaignRepository.get(input.id);
    if (existing) {
      throw new ORPCError("CONFLICT", {
        message: `Campaign ${input.id} already exists`,
      });
    }
    return this.campaignRepository.create(userId, input);
  }

  async updateCampaign(userId: string, patch: UpdateCampaign): Promise<Campaign> {
    const ownerUserId = await this.campaignRepository.ownerIdOf(patch.id);
    if (!ownerUserId) {
      throw new ORPCError("NOT_FOUND", {
        message: `Campaign ${patch.id} not found`,
      });
    }
    if (ownerUserId !== userId) {
      throw new ORPCError("FORBIDDEN", {
        message: `Only the campaign owner can update ${patch.id}`,
      });
    }
    const updated = await this.campaignRepository.update(patch.id, patch);
    if (!updated) {
      throw new ORPCError("NOT_FOUND", { message: `Campaign ${patch.id} not found` });
    }
    return updated;
  }

  async removeCampaign(userId: string, id: string): Promise<Campaign> {
    const ownerUserId = await this.campaignRepository.ownerIdOf(id);
    if (!ownerUserId) {
      throw new ORPCError("NOT_FOUND", { message: `Campaign ${id} not found` });
    }
    if (ownerUserId !== userId) {
      throw new ORPCError("FORBIDDEN", {
        message: `Only the campaign owner can remove ${id}`,
      });
    }
    const removed = await this.campaignRepository.deactivate(id);
    if (!removed) {
      throw new ORPCError("NOT_FOUND", { message: `Campaign ${id} not found` });
    }
    return removed;
  }

  /**
   * Wires the twitter plugin's in-process client factory (injected at
   * router-build time — createRouter receives the loaded sibling plugins;
   * initialize does not). XConnectFlow is stateless, so per-access
   * construction is safe.
   */
  attachTwitter(factory?: TwitterPluginClient) {
    this.twitterFactory = factory;
  }

  attachConnectors(factory?: (userId: string) => unknown) {
    this.connectorsFactory = factory;
  }

  private get xConnect(): XConnectFlow | undefined {
    return this.twitterFactory
      ? new XConnectFlow(this.twitterFactory, this.xCredentials)
      : undefined;
  }

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
    if (input.platform !== "twitter" || !this.xConnect) {
      return {
        status: "unavailable",
        message: unavailableMessage(input.platform, "account connection"),
      };
    }

    const { url, state } = await this.xConnect.start({ userId, redirectUri: input.redirectUri });

    return {
      status: "redirect",
      url,
      state,
    };
  }

  async completeConnect(
    userId: string,
    input: SocialConnectCallbackInput,
    nearAccountId?: string,
  ): Promise<SocialConnectCallbackResponse> {
    if (input.platform !== "twitter" || !this.xConnect) {
      throw new ORPCError("BAD_REQUEST", {
        message: unavailableMessage(input.platform, "account connection"),
      });
    }

    const response = await this.xConnect.complete({ userId, nearAccountId, ...input });

    await this.repository.recordConnectedAccount(userId, input.platform, {
      platformUserId: response.xUserId,
      username: response.username,
    });

    const connectors = this.connectorsFactory?.(userId) as
      | {
          outlayerWalletConnect: (input: {
            agentId: string;
            walletApiKey: string;
          }) => Promise<unknown>;
          outlayerAppWalletAttach: (input: {
            agentId: string;
            rowProfile: string;
          }) => Promise<unknown>;
        }
      | undefined;
    if (connectors) {
      try {
        if (input.walletApiKey) {
          await connectors.outlayerWalletConnect({
            agentId: userId,
            walletApiKey: input.walletApiKey,
          });
        } else {
          await connectors.outlayerAppWalletAttach({
            agentId: userId,
            rowProfile: profileForUser(nearAccountId ?? userId),
          });
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new ORPCError("BAD_GATEWAY", {
          message: `X connected, but the OutLayer wallet registration failed: ${detail}`,
        });
      }
    }

    return response;
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
