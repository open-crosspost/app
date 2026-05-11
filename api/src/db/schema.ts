import { index, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

export const socialConnectedAccounts = pgTable(
  "social_connected_accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    platform: text("platform").notNull(),
    platformUserId: text("platform_user_id").notNull(),
    username: text("username"),
    profileImageUrl: text("profile_image_url"),
    connectedAt: text("connected_at").notNull(),
    lastSyncedAt: text("last_synced_at"),
    status: text("status").notNull().default("connected"),
    error: text("error"),
    profileJson: text("profile_json"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    userPlatformUserUnique: uniqueIndex("social_connected_accounts_user_platform_user_idx").on(
      table.userId,
      table.platform,
      table.platformUserId,
    ),
    userIdx: index("social_connected_accounts_user_idx").on(table.userId),
  }),
);

export const socialPlatformCredentials = pgTable(
  "social_platform_credentials",
  {
    id: text("id").primaryKey(),
    connectedAccountId: text("connected_account_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: text("expires_at"),
    scope: text("scope"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    connectedAccountIdx: uniqueIndex("social_platform_credentials_account_idx").on(
      table.connectedAccountId,
    ),
  }),
);

export const socialActivity = pgTable(
  "social_activity",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    platform: text("platform").notNull(),
    platformUserId: text("platform_user_id").notNull(),
    type: text("type").notNull(),
    content: text("content"),
    url: text("url"),
    metricsJson: text("metrics_json"),
    inReplyToId: text("in_reply_to_id"),
    quotedPostId: text("quoted_post_id"),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    ownerIdx: index("social_activity_owner_idx").on(table.ownerUserId),
    ownerCreatedAtIdx: index("social_activity_owner_created_at_idx").on(
      table.ownerUserId,
      table.createdAt,
    ),
  }),
);
