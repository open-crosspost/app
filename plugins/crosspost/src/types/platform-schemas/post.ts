import { z } from "every-plugin/zod";
import { AuthenticatedRequestSchema } from "./auth";

export const MediaContentSchema = z.object({
  data: z.union([z.string(), z.instanceof(Blob)]),
  mimeType: z.string().optional(),
  altText: z.string().optional(),
});

export const PostContentSchema = z.object({
  text: z.string().optional(),
  media: z.array(MediaContentSchema).optional(),
});

export const CreatePostInputSchema = AuthenticatedRequestSchema.extend({
  content: z.union([PostContentSchema, z.array(PostContentSchema)]),
});

export const DeletePostInputSchema = AuthenticatedRequestSchema.extend({
  postId: z.string(),
});

export const RepostInputSchema = AuthenticatedRequestSchema.extend({
  postId: z.string(),
});

export const QuotePostInputSchema = AuthenticatedRequestSchema.extend({
  postId: z.string(),
  content: z.union([PostContentSchema, z.array(PostContentSchema)]),
});

export const ReplyInputSchema = AuthenticatedRequestSchema.extend({
  postId: z.string(),
  content: z.union([PostContentSchema, z.array(PostContentSchema)]),
});

export const LikeInputSchema = AuthenticatedRequestSchema.extend({
  postId: z.string(),
});

export const UnlikeInputSchema = AuthenticatedRequestSchema.extend({
  postId: z.string(),
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

export type MediaContent = z.infer<typeof MediaContentSchema>;
export type PostContent = z.infer<typeof PostContentSchema>;
export type CreatePostInput = z.infer<typeof CreatePostInputSchema>;
export type DeletePostInput = z.infer<typeof DeletePostInputSchema>;
export type RepostInput = z.infer<typeof RepostInputSchema>;
export type QuotePostInput = z.infer<typeof QuotePostInputSchema>;
export type ReplyInput = z.infer<typeof ReplyInputSchema>;
export type LikeInput = z.infer<typeof LikeInputSchema>;
export type UnlikeInput = z.infer<typeof UnlikeInputSchema>;
export type PostResult = z.infer<typeof PostResultSchema>;
export type DeleteResult = z.infer<typeof DeleteResultSchema>;
export type LikeResult = z.infer<typeof LikeResultSchema>;
