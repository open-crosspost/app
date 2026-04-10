import { z } from "every-plugin/zod";
import { PlatformSchema } from "./platform";

export enum TimePeriod {
  DAY = "day",
  WEEK = "week",
  MONTH = "month",
  YEAR = "year",
  ALL_TIME = "all_time",
  ALL = "all",
  CUSTOM = "custom",
}

export const TimePeriodSchema = z.nativeEnum(TimePeriod);

export enum ActivityType {
  POST = "post",
  REPOST = "repost",
  QUOTE = "quote",
  REPLY = "reply",
}

export const ActivityTypeSchema = z.nativeEnum(ActivityType);

export const FilterSchema = z.object({
  platforms: z.array(z.string()).optional(),
  types: z.array(z.string()).optional(),
});

export const ActivityLeaderboardQuerySchema = z.object({
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
  platforms: z.array(z.string()).optional(),
  types: z.array(z.string()).optional(),
  timeframe: TimePeriodSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const AccountActivityEntrySchema = z.object({
  signerId: z.string(),
  postCount: z.number(),
  firstPostTimestamp: z.number(),
  lastPostTimestamp: z.number(),
});

export const PlatformActivitySchema = AccountActivityEntrySchema.extend({
  platform: z.string(),
});

export const ActivityLeaderboardResponseSchema = z.object({
  leaderboard: z.array(AccountActivityEntrySchema),
  total: z.number(),
});

export const AccountActivityParamsSchema = z.object({
  signerId: z.string(),
});

export const AccountActivityQuerySchema = z.object({
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
  platforms: z.array(z.string()).optional(),
  types: z.array(z.string()).optional(),
  timeframe: TimePeriodSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const AccountActivityResponseSchema = z.object({
  signerId: z.string(),
  activity: z.array(PlatformActivitySchema),
  total: z.number(),
});

export const AccountPostsParamsSchema = z.object({
  signerId: z.string(),
});

export const AccountPostsQuerySchema = z.object({
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
  platforms: z.array(z.string()).optional(),
  types: z.array(z.string()).optional(),
  timeframe: TimePeriodSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const AccountPostSchema = z.object({
  id: z.string(),
  platform: PlatformSchema,
  userId: z.string(),
  type: ActivityTypeSchema,
  content: z.string().optional(),
  url: z.string().optional(),
  createdAt: z.string(),
  metrics: z
    .object({
      likes: z.number().optional(),
      reposts: z.number().optional(),
      replies: z.number().optional(),
      quotes: z.number().optional(),
    })
    .optional(),
  inReplyToId: z.string().optional(),
  quotedPostId: z.string().optional(),
});

export const AccountPostsResponseSchema = z.object({
  signerId: z.string(),
  posts: z.array(AccountPostSchema),
  platforms: z.array(z.string()).optional(),
  types: z.array(z.string()).optional(),
});

export type Filter = z.infer<typeof FilterSchema>;
export type ActivityLeaderboardQuery = z.infer<typeof ActivityLeaderboardQuerySchema>;
export type AccountActivityEntry = z.infer<typeof AccountActivityEntrySchema>;
export type PlatformActivity = z.infer<typeof PlatformActivitySchema>;
export type ActivityLeaderboardResponse = z.infer<typeof ActivityLeaderboardResponseSchema>;
export type AccountActivityParams = z.infer<typeof AccountActivityParamsSchema>;
export type AccountActivityQuery = z.infer<typeof AccountActivityQuerySchema>;
export type AccountActivityResponse = z.infer<typeof AccountActivityResponseSchema>;
export type AccountPostsParams = z.infer<typeof AccountPostsParamsSchema>;
export type AccountPostsQuery = z.infer<typeof AccountPostsQuerySchema>;
export type AccountPost = z.infer<typeof AccountPostSchema>;
export type AccountPostsResponse = z.infer<typeof AccountPostsResponseSchema>;
