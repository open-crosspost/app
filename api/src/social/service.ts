import { ORPCError } from "@orpc/server";
import { CampaignRepository } from "./campaign-repository";
import { JobRepository } from "./job-repository";
import type { SocialRepository } from "./repository";
import type {
  AccountPostsQuery,
  ActivityLeaderboardQuery,
  Campaign,
  CampaignSeed,
  CampaignSeedRecord,
  CreateCampaign,
  CreatePostRequest,
  DeletePostRequest,
  JobRun,
  JobRunClaim,
  JobRunListQuery,
  JobRunReport,
  JobSpec,
  JobSpecCreate,
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

function assertCampaignDate(date: string): void {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Invalid seed date: ${date} (expected UTC YYYY-MM-DD)`,
    });
  }
}

function unavailableMessage(subject: string, action: string): string {
  return `${action} for ${subject} is not implemented yet.`;
}

export class SocialService {
  private twitterFactory?: TwitterPluginClient;
  private connectorsFactory?: (userId: string) => unknown;
  private readonly xCredentials: XClientCredentials;
  private readonly campaignRepository: CampaignRepository;
  private readonly jobRepository: JobRepository;

  constructor(
    private readonly repository: SocialRepository,
    xCredentials: XClientCredentials = {},
    campaignRepository?: CampaignRepository,
  ) {
    this.xCredentials = xCredentials;
    this.campaignRepository = campaignRepository ?? new CampaignRepository(repository.database);
    this.jobRepository = new JobRepository(repository.database);
  }

  ensureJobSchema(): Promise<void> {
    return this.jobRepository.ensureSchema();
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

  async seedRecord(userId: string, input: CampaignSeedRecord): Promise<CampaignSeed> {
    const ownerUserId = await this.campaignRepository.ownerIdOf(input.campaignId);
    if (!ownerUserId) {
      throw new ORPCError("NOT_FOUND", {
        message: `Campaign ${input.campaignId} not found`,
      });
    }
    if (ownerUserId !== userId) {
      throw new ORPCError("FORBIDDEN", {
        message: `Only the campaign owner can record seeds for ${input.campaignId}`,
      });
    }

    const date = input.date ?? new Date().toISOString().slice(0, 10);
    assertCampaignDate(date);

    return this.campaignRepository.upsertSeed(input.campaignId, date, {
      nearPostId: input.nearPostId ?? null,
      xPostId: input.xPostId ?? null,
    });
  }

  async seedToday(campaignId: string): Promise<CampaignSeed | null> {
    const campaign = await this.campaignRepository.get(campaignId);
    if (!campaign) {
      throw new ORPCError("NOT_FOUND", { message: `Campaign ${campaignId} not found` });
    }
    return this.campaignRepository.getSeed(campaignId, new Date().toISOString().slice(0, 10));
  }

  async createJobSpec(
    userId: string,
    input: JobSpecCreate,
    nearAccountId?: string | null,
    linkedNearAccounts?: Array<{ accountId: string }> | null,
  ): Promise<JobSpec> {
    if (input.schedule.mode === "once" && Date.parse(input.schedule.at) <= Date.now()) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Scheduled time must be in the future",
      });
    }
    if (input.kind === "campaign") {
      const campaign = await this.campaignRepository.get(input.campaignId!);
      if (!campaign || campaign.status !== "active") {
        throw new ORPCError("NOT_FOUND", {
          message: `Campaign ${input.campaignId} not found`,
        });
      }
    }

    await this.assertTargetsBelongToCaller(
      userId,
      input.targets,
      nearAccountId,
      linkedNearAccounts,
    );

    return this.jobRepository.createSpec(userId, input);
  }

  async listJobSpecs(userId: string): Promise<JobSpec[]> {
    return this.jobRepository.listSpecs(userId);
  }

  async updateJobSpec(
    userId: string,
    input: { id: string; status: "active" | "paused" | "cancelled" },
  ): Promise<JobSpec> {
    const spec = await this.jobRepository.updateSpecStatus(userId, input.id, input.status);
    if (!spec) {
      throw new ORPCError("NOT_FOUND", { message: `Job spec ${input.id} not found` });
    }
    return spec;
  }

  async listJobRuns(userId: string, query?: JobRunListQuery): Promise<JobRun[]> {
    return this.jobRepository.listRuns(userId, query);
  }

  async claimJobRun(userId: string, input: JobRunClaim): Promise<JobRun> {
    const run = await this.jobRepository.claimRun(userId, input.runId, input.expectedStatus);
    if (!run) {
      throw new ORPCError("NOT_FOUND", {
        message: `Run ${input.runId} is not claimable in status ${input.expectedStatus}`,
      });
    }
    return run;
  }

  async reportJobRun(userId: string, input: JobRunReport): Promise<JobRun> {
    const run = await this.jobRepository.reportRun(userId, input.runId, input);
    if (!run) {
      throw new ORPCError("NOT_FOUND", {
        message: `Run ${input.runId} is not executing (nothing was reported)`,
      });
    }
    return run;
  }

  private async assertTargetsBelongToCaller(
    userId: string,
    targets: Array<{ platform: string; accountUserId: string }>,
    nearAccountId?: string | null,
    linkedNearAccounts?: Array<{ accountId: string }> | null,
  ) {
    const targetPlatforms = new Set(targets.map((target) => target.platform));
    const platformUserIds = new Map<string, Set<string>>();
    for (const account of await this.repository.listAccounts(userId)) {
      if (!targetPlatforms.has(account.platform)) continue;
      const userIds = platformUserIds.get(account.platform) ?? new Set<string>();
      userIds.add(account.userId);
      platformUserIds.set(account.platform, userIds);
    }

    const nearIds = new Set<string>();
    if (nearAccountId) nearIds.add(nearAccountId);
    for (const linked of linkedNearAccounts ?? []) {
      nearIds.add(linked.accountId);
    }

    for (const target of targets) {
      if (target.platform === "near-social") {
        if (!nearIds.has(target.accountUserId)) {
          throw new ORPCError("FORBIDDEN", {
            message: `${target.accountUserId} is not a NEAR account linked to this session`,
          });
        }
        continue;
      }
      const userIds = platformUserIds.get(target.platform);
      if (!userIds?.has(target.accountUserId)) {
        throw new ORPCError("FORBIDDEN", {
          message: `${target.accountUserId} is not connected for ${target.platform}`,
        });
      }
    }
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
