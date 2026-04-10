import { z } from "every-plugin/zod";
import { PlatformSchema } from "./platform";

export const MediaContentSchema = z.object({
  data: z.union([z.string(), z.instanceof(Blob)]),
  mimeType: z.string().optional(),
  altText: z.string().optional(),
});

export const MediaSchema = z.object({
  id: z.string(),
  type: z.enum(["image", "video", "gif"]),
  url: z.string().optional(),
  altText: z.string().optional(),
});

export const PostMetricsSchema = z.object({
  retweets: z.number(),
  quotes: z.number(),
  likes: z.number(),
  replies: z.number(),
});

export const PostSchema = z.object({
  id: z.string(),
  text: z.string(),
  createdAt: z.string(),
  authorId: z.string(),
  media: z.array(MediaSchema).optional(),
  metrics: PostMetricsSchema.optional(),
  inReplyToId: z.string().optional(),
  quotedPostId: z.string().optional(),
});

export const PostContentSchema = z.object({
  text: z.string().optional(),
  media: z.array(MediaContentSchema).optional(),
});

export const PostResultSchema = z.object({
  id: z.string(),
  text: z.string().optional(),
  createdAt: z.string(),
  mediaIds: z.array(z.string()).optional(),
  threadIds: z.array(z.string()).optional(),
  quotedPostId: z.string().optional(),
  inReplyToId: z.string().optional(),
  success: z.boolean().optional(),
});

export const DeleteResultSchema = z.object({
  success: z.boolean(),
  id: z.string(),
});

export const LikeResultSchema = z.object({
  success: z.boolean(),
  id: z.string(),
});

export const TargetSchema = z.object({
  platform: PlatformSchema,
  userId: z.string(),
});

export const CreatePostRequestSchema = z.object({
  targets: z.array(TargetSchema),
  content: z.array(PostContentSchema),
});

export const RepostRequestSchema = z.object({
  targets: z.array(TargetSchema),
  platform: PlatformSchema,
  postId: z.string(),
});

export const QuotePostRequestSchema = z.object({
  targets: z.array(TargetSchema),
  platform: PlatformSchema,
  postId: z.string(),
  content: z.array(PostContentSchema),
});

export const ReplyToPostRequestSchema = z.object({
  targets: z.array(TargetSchema),
  platform: PlatformSchema,
  postId: z.string(),
  content: z.array(PostContentSchema),
});

export const PostToDeleteSchema = z.object({
  platform: PlatformSchema,
  userId: z.string(),
  postId: z.string(),
});

export const DeletePostRequestSchema = z.object({
  targets: z.array(TargetSchema),
  posts: z.array(PostToDeleteSchema),
});

export const LikePostRequestSchema = z.object({
  targets: z.array(TargetSchema),
  platform: PlatformSchema,
  postId: z.string(),
});

export const UnlikePostRequestSchema = z.object({
  targets: z.array(TargetSchema),
  platform: PlatformSchema,
  postId: z.string(),
});

export const PostResponseSchema = z.union([PostSchema, z.array(PostSchema)]);
export const CreatePostResponseSchema = z.union([PostSchema, z.array(PostSchema)]);
export const RepostResponseSchema = z.union([PostSchema, z.array(PostSchema)]);
export const QuotePostResponseSchema = z.union([PostSchema, z.array(PostSchema)]);
export const ReplyToPostResponseSchema = z.union([PostSchema, z.array(PostSchema)]);
export const DeletePostResponseSchema = z.union([PostSchema, z.array(PostSchema)]);
export const LikePostResponseSchema = z.union([PostSchema, z.array(PostSchema)]);
export const UnlikePostResponseSchema = z.union([PostSchema, z.array(PostSchema)]);

export type MediaContent = z.infer<typeof MediaContentSchema>;
export type Media = z.infer<typeof MediaSchema>;
export type PostMetrics = z.infer<typeof PostMetricsSchema>;
export type Post = z.infer<typeof PostSchema>;
export type PostContent = z.infer<typeof PostContentSchema>;
export type PostResult = z.infer<typeof PostResultSchema>;
export type DeleteResult = z.infer<typeof DeleteResultSchema>;
export type LikeResult = z.infer<typeof LikeResultSchema>;
export type Target = z.infer<typeof TargetSchema>;
export type CreatePostRequest = z.infer<typeof CreatePostRequestSchema>;
export type RepostRequest = z.infer<typeof RepostRequestSchema>;
export type QuotePostRequest = z.infer<typeof QuotePostRequestSchema>;
export type ReplyToPostRequest = z.infer<typeof ReplyToPostRequestSchema>;
export type PostToDelete = z.infer<typeof PostToDeleteSchema>;
export type DeletePostRequest = z.infer<typeof DeletePostRequestSchema>;
export type LikePostRequest = z.infer<typeof LikePostRequestSchema>;
export type UnlikePostRequest = z.infer<typeof UnlikePostRequestSchema>;
export type PostResponse = z.infer<typeof PostResponseSchema>;
export type CreatePostResponse = z.infer<typeof CreatePostResponseSchema>;
export type RepostResponse = z.infer<typeof RepostResponseSchema>;
export type QuotePostResponse = z.infer<typeof QuotePostResponseSchema>;
export type ReplyToPostResponse = z.infer<typeof ReplyToPostResponseSchema>;
export type DeletePostResponse = z.infer<typeof DeletePostResponseSchema>;
export type LikePostResponse = z.infer<typeof LikePostResponseSchema>;
export type UnlikePostResponse = z.infer<typeof UnlikePostResponseSchema>;
