import { and, desc, eq } from "drizzle-orm";
import type { ApiDatabase } from "../db";
import {
  socialActivity,
  socialConnectedAccounts,
  socialPlatformCredentials,
} from "../db/schema";
import type {
  AccountPostsQuery,
  ActivityLeaderboardQuery,
  ActivityType,
  ConnectedAccount,
  Platform,
  SocialActivityLeaderboardResponse,
  TimePeriod,
} from "./types";

interface ConnectedAccountRow {
  platform: string;
  platformUserId: string;
  connectedAt: string;
  username: string | null;
  profileImageUrl: string | null;
  status: string;
  error: string | null;
}

interface ActivityRow {
  ownerUserId: string;
  platform: string;
  platformUserId: string;
  type: string;
  content: string | null;
  url: string | null;
  metricsJson: string | null;
  inReplyToId: string | null;
  quotedPostId: string | null;
  createdAt: string;
}

function mapConnectedAccount(row: ConnectedAccountRow): ConnectedAccount {
  return {
    platform: row.platform as Platform,
    userId: row.platformUserId,
    connectedAt: row.connectedAt,
    error: row.error ?? undefined,
    profile: row.username
      ? {
          userId: row.platformUserId,
          username: row.username,
          profileImageUrl: row.profileImageUrl ?? "",
          platform: row.platform as Platform,
          lastUpdated: Date.parse(row.connectedAt) || Date.now(),
        }
      : null,
  };
}

function getTimeRange(query?: { timeframe?: TimePeriod; startDate?: string; endDate?: string }) {
  const start = query?.startDate ? Date.parse(query.startDate) : null;
  const end = query?.endDate ? Date.parse(query.endDate) : null;

  if (start || end) {
    return { start, end };
  }

  const now = Date.now();

  switch (query?.timeframe) {
    case "day":
      return { start: now - 24 * 60 * 60 * 1000, end: now };
    case "week":
      return { start: now - 7 * 24 * 60 * 60 * 1000, end: now };
    case "month":
      return { start: now - 30 * 24 * 60 * 60 * 1000, end: now };
    case "year":
      return { start: now - 365 * 24 * 60 * 60 * 1000, end: now };
    default:
      return { start: null, end: null };
  }
}

function matchesQueryTimeframe(
  createdAt: string,
  query?: { timeframe?: TimePeriod; startDate?: string; endDate?: string },
) {
  const timestamp = Date.parse(createdAt);

  if (Number.isNaN(timestamp)) {
    return false;
  }

  const range = getTimeRange(query);

  if (range.start !== null && timestamp < range.start) {
    return false;
  }

  if (range.end !== null && timestamp > range.end) {
    return false;
  }

  return true;
}

export class SocialRepository {
  constructor(private readonly db: ApiDatabase) {}

  async ensureSchema(): Promise<void> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS social_connected_accounts (
        id text PRIMARY KEY,
        user_id text NOT NULL,
        platform text NOT NULL,
        platform_user_id text NOT NULL,
        username text,
        profile_image_url text,
        connected_at text NOT NULL,
        last_synced_at text,
        status text NOT NULL DEFAULT 'connected',
        error text,
        profile_json text,
        created_at text NOT NULL,
        updated_at text NOT NULL
      )
    `);

    await this.db.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS social_connected_accounts_user_platform_user_idx
      ON social_connected_accounts (user_id, platform, platform_user_id)
    `);

    await this.db.execute(`
      CREATE INDEX IF NOT EXISTS social_connected_accounts_user_idx
      ON social_connected_accounts (user_id)
    `);

    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS social_platform_credentials (
        id text PRIMARY KEY,
        connected_account_id text NOT NULL,
        access_token text,
        refresh_token text,
        expires_at text,
        scope text,
        created_at text NOT NULL,
        updated_at text NOT NULL
      )
    `);

    await this.db.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS social_platform_credentials_account_idx
      ON social_platform_credentials (connected_account_id)
    `);

    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS social_activity (
        id text PRIMARY KEY,
        owner_user_id text NOT NULL,
        platform text NOT NULL,
        platform_user_id text NOT NULL,
        type text NOT NULL,
        content text,
        url text,
        metrics_json text,
        in_reply_to_id text,
        quoted_post_id text,
        created_at text NOT NULL
      )
    `);

    await this.db.execute(`
      CREATE INDEX IF NOT EXISTS social_activity_owner_idx
      ON social_activity (owner_user_id)
    `);

    await this.db.execute(`
      CREATE INDEX IF NOT EXISTS social_activity_owner_created_at_idx
      ON social_activity (owner_user_id, created_at)
    `);
  }

  async listAccounts(userId: string): Promise<ConnectedAccount[]> {
    const rows = await this.db
      .select({
        platform: socialConnectedAccounts.platform,
        platformUserId: socialConnectedAccounts.platformUserId,
        connectedAt: socialConnectedAccounts.connectedAt,
        username: socialConnectedAccounts.username,
        profileImageUrl: socialConnectedAccounts.profileImageUrl,
        status: socialConnectedAccounts.status,
        error: socialConnectedAccounts.error,
      })
      .from(socialConnectedAccounts)
      .where(eq(socialConnectedAccounts.userId, userId))
      .orderBy(desc(socialConnectedAccounts.connectedAt));

    return rows.map(mapConnectedAccount);
  }

  async getAccount(userId: string, platform: Platform, platformUserId: string) {
    const rows = await this.db
      .select({
        platform: socialConnectedAccounts.platform,
        platformUserId: socialConnectedAccounts.platformUserId,
        connectedAt: socialConnectedAccounts.connectedAt,
        username: socialConnectedAccounts.username,
        profileImageUrl: socialConnectedAccounts.profileImageUrl,
        status: socialConnectedAccounts.status,
        error: socialConnectedAccounts.error,
      })
      .from(socialConnectedAccounts)
      .where(
        and(
          eq(socialConnectedAccounts.userId, userId),
          eq(socialConnectedAccounts.platform, platform),
          eq(socialConnectedAccounts.platformUserId, platformUserId),
        ),
      )
      .limit(1);

    return rows[0] ? mapConnectedAccount(rows[0]) : null;
  }

  async deleteAccount(userId: string, platform: Platform, platformUserId: string): Promise<boolean> {
    const account = await this.db
      .select({ id: socialConnectedAccounts.id })
      .from(socialConnectedAccounts)
      .where(
        and(
          eq(socialConnectedAccounts.userId, userId),
          eq(socialConnectedAccounts.platform, platform),
          eq(socialConnectedAccounts.platformUserId, platformUserId),
        ),
      )
      .limit(1);

    if (!account[0]) {
      return false;
    }

    await this.db
      .delete(socialPlatformCredentials)
      .where(eq(socialPlatformCredentials.connectedAccountId, account[0].id));

    await this.db
      .delete(socialConnectedAccounts)
      .where(eq(socialConnectedAccounts.id, account[0].id));

    return true;
  }

  async touchAccount(userId: string, platform: Platform, platformUserId: string) {
    const now = new Date().toISOString();
    await this.db
      .update(socialConnectedAccounts)
      .set({ lastSyncedAt: now, updatedAt: now, error: null })
      .where(
        and(
          eq(socialConnectedAccounts.userId, userId),
          eq(socialConnectedAccounts.platform, platform),
          eq(socialConnectedAccounts.platformUserId, platformUserId),
        ),
      );

    return this.getAccount(userId, platform, platformUserId);
  }

  async listAccountPosts(
    ownerUserId: string,
    query?: AccountPostsQuery,
  ) {
    const rows = await this.db
      .select({
        ownerUserId: socialActivity.ownerUserId,
        platform: socialActivity.platform,
        platformUserId: socialActivity.platformUserId,
        type: socialActivity.type,
        content: socialActivity.content,
        url: socialActivity.url,
        metricsJson: socialActivity.metricsJson,
        inReplyToId: socialActivity.inReplyToId,
        quotedPostId: socialActivity.quotedPostId,
        createdAt: socialActivity.createdAt,
      })
      .from(socialActivity)
      .where(eq(socialActivity.ownerUserId, ownerUserId))
      .orderBy(desc(socialActivity.createdAt));

    const filtered = rows.filter((row) => {
      if (!matchesQueryTimeframe(row.createdAt, query)) {
        return false;
      }

      if (query?.platforms?.length && !query.platforms.includes(row.platform)) {
        return false;
      }

      if (query?.types?.length && !query.types.includes(row.type)) {
        return false;
      }

      return true;
    });

    const offset = query?.offset ?? 0;
    const limit = query?.limit ?? filtered.length;
    const paged = filtered.slice(offset, offset + limit);

    return {
      signerId: ownerUserId,
      posts: paged.map((row, index) => ({
        id: `${row.platform}:${row.platformUserId}:${row.createdAt}:${index}`,
        platform: row.platform as Platform,
        userId: row.platformUserId,
        type: row.type as ActivityType,
        content: row.content ?? undefined,
        url: row.url ?? undefined,
        createdAt: row.createdAt,
        inReplyToId: row.inReplyToId ?? undefined,
        quotedPostId: row.quotedPostId ?? undefined,
        metrics: row.metricsJson
          ? (JSON.parse(row.metricsJson) as {
              likes?: number;
              reposts?: number;
              replies?: number;
              quotes?: number;
            })
          : undefined,
      })),
      platforms: query?.platforms,
      types: query?.types,
    };
  }

  async getLeaderboard(query?: {
    limit?: number;
    offset?: number;
    platforms?: string[];
    types?: string[];
    timeframe?: TimePeriod;
    startDate?: string;
    endDate?: string;
  }): Promise<SocialActivityLeaderboardResponse> {
    const rows = await this.db
      .select({
        ownerUserId: socialActivity.ownerUserId,
        platform: socialActivity.platform,
        platformUserId: socialActivity.platformUserId,
        type: socialActivity.type,
        content: socialActivity.content,
        url: socialActivity.url,
        metricsJson: socialActivity.metricsJson,
        inReplyToId: socialActivity.inReplyToId,
        quotedPostId: socialActivity.quotedPostId,
        createdAt: socialActivity.createdAt,
      })
      .from(socialActivity)
      .orderBy(desc(socialActivity.createdAt));

    const filtered = rows.filter((row) => {
      if (!matchesQueryTimeframe(row.createdAt, query)) {
        return false;
      }

      if (query?.platforms?.length && !query.platforms.includes(row.platform)) {
        return false;
      }

      if (query?.types?.length && !query.types.includes(row.type)) {
        return false;
      }

      return true;
    });

    const aggregates = new Map<
      string,
      { signerId: string; postCount: number; firstPostTimestamp: number; lastPostTimestamp: number }
    >();

    for (const row of filtered) {
      const timestamp = Date.parse(row.createdAt) || 0;
      const existing = aggregates.get(row.ownerUserId);
      if (existing) {
        existing.postCount += 1;
        existing.firstPostTimestamp = Math.min(existing.firstPostTimestamp, timestamp);
        existing.lastPostTimestamp = Math.max(existing.lastPostTimestamp, timestamp);
        continue;
      }

      aggregates.set(row.ownerUserId, {
        signerId: row.ownerUserId,
        postCount: 1,
        firstPostTimestamp: timestamp,
        lastPostTimestamp: timestamp,
      });
    }

    const entries = [...aggregates.values()].sort((a, b) => b.postCount - a.postCount);
    const offset = query?.offset ?? 0;
    const limit = query?.limit ?? entries.length;

    return {
      entries: entries.slice(offset, offset + limit),
      meta: {
        pagination: {
          total: entries.length,
        },
      },
    };
  }

}
