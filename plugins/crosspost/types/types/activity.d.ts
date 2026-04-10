import { z } from "every-plugin/zod";
export declare enum TimePeriod {
    DAY = "day",
    WEEK = "week",
    MONTH = "month",
    YEAR = "year",
    ALL_TIME = "all_time",
    ALL = "all",
    CUSTOM = "custom"
}
export declare const TimePeriodSchema: z.ZodEnum<typeof TimePeriod>;
export declare enum ActivityType {
    POST = "post",
    REPOST = "repost",
    QUOTE = "quote",
    REPLY = "reply"
}
export declare const ActivityTypeSchema: z.ZodEnum<typeof ActivityType>;
export declare const FilterSchema: z.ZodObject<{
    platforms: z.ZodOptional<z.ZodArray<z.ZodString>>;
    types: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const ActivityLeaderboardQuerySchema: z.ZodObject<{
    limit: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    offset: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    platforms: z.ZodOptional<z.ZodArray<z.ZodString>>;
    types: z.ZodOptional<z.ZodArray<z.ZodString>>;
    timeframe: z.ZodOptional<z.ZodEnum<typeof TimePeriod>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const AccountActivityEntrySchema: z.ZodObject<{
    signerId: z.ZodString;
    postCount: z.ZodNumber;
    firstPostTimestamp: z.ZodNumber;
    lastPostTimestamp: z.ZodNumber;
}, z.core.$strip>;
export declare const PlatformActivitySchema: z.ZodObject<{
    signerId: z.ZodString;
    postCount: z.ZodNumber;
    firstPostTimestamp: z.ZodNumber;
    lastPostTimestamp: z.ZodNumber;
    platform: z.ZodString;
}, z.core.$strip>;
export declare const ActivityLeaderboardResponseSchema: z.ZodObject<{
    leaderboard: z.ZodArray<z.ZodObject<{
        signerId: z.ZodString;
        postCount: z.ZodNumber;
        firstPostTimestamp: z.ZodNumber;
        lastPostTimestamp: z.ZodNumber;
    }, z.core.$strip>>;
    total: z.ZodNumber;
}, z.core.$strip>;
export declare const AccountActivityParamsSchema: z.ZodObject<{
    signerId: z.ZodString;
}, z.core.$strip>;
export declare const AccountActivityQuerySchema: z.ZodObject<{
    limit: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    offset: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    platforms: z.ZodOptional<z.ZodArray<z.ZodString>>;
    types: z.ZodOptional<z.ZodArray<z.ZodString>>;
    timeframe: z.ZodOptional<z.ZodEnum<typeof TimePeriod>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const AccountActivityResponseSchema: z.ZodObject<{
    signerId: z.ZodString;
    activity: z.ZodArray<z.ZodObject<{
        signerId: z.ZodString;
        postCount: z.ZodNumber;
        firstPostTimestamp: z.ZodNumber;
        lastPostTimestamp: z.ZodNumber;
        platform: z.ZodString;
    }, z.core.$strip>>;
    total: z.ZodNumber;
}, z.core.$strip>;
export declare const AccountPostsParamsSchema: z.ZodObject<{
    signerId: z.ZodString;
}, z.core.$strip>;
export declare const AccountPostsQuerySchema: z.ZodObject<{
    limit: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    offset: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    platforms: z.ZodOptional<z.ZodArray<z.ZodString>>;
    types: z.ZodOptional<z.ZodArray<z.ZodString>>;
    timeframe: z.ZodOptional<z.ZodEnum<typeof TimePeriod>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const AccountPostSchema: z.ZodObject<{
    id: z.ZodString;
    platform: z.ZodEnum<typeof import("./platform").Platform>;
    userId: z.ZodString;
    type: z.ZodEnum<typeof ActivityType>;
    content: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
    metrics: z.ZodOptional<z.ZodObject<{
        likes: z.ZodOptional<z.ZodNumber>;
        reposts: z.ZodOptional<z.ZodNumber>;
        replies: z.ZodOptional<z.ZodNumber>;
        quotes: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    inReplyToId: z.ZodOptional<z.ZodString>;
    quotedPostId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const AccountPostsResponseSchema: z.ZodObject<{
    signerId: z.ZodString;
    posts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        platform: z.ZodEnum<typeof import("./platform").Platform>;
        userId: z.ZodString;
        type: z.ZodEnum<typeof ActivityType>;
        content: z.ZodOptional<z.ZodString>;
        url: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodString;
        metrics: z.ZodOptional<z.ZodObject<{
            likes: z.ZodOptional<z.ZodNumber>;
            reposts: z.ZodOptional<z.ZodNumber>;
            replies: z.ZodOptional<z.ZodNumber>;
            quotes: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        inReplyToId: z.ZodOptional<z.ZodString>;
        quotedPostId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    platforms: z.ZodOptional<z.ZodArray<z.ZodString>>;
    types: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
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
