import { z } from "every-plugin/zod";
export declare const MediaContentSchema: z.ZodObject<{
    data: z.ZodUnion<readonly [z.ZodString, z.ZodCustom<Blob, Blob>]>;
    mimeType: z.ZodOptional<z.ZodString>;
    altText: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const PostContentSchema: z.ZodObject<{
    text: z.ZodOptional<z.ZodString>;
    media: z.ZodOptional<z.ZodArray<z.ZodObject<{
        data: z.ZodUnion<readonly [z.ZodString, z.ZodCustom<Blob, Blob>]>;
        mimeType: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const CreatePostInputSchema: z.ZodObject<{
    userId: z.ZodString;
    accessToken: z.ZodString;
    refreshToken: z.ZodOptional<z.ZodString>;
    expiresAt: z.ZodOptional<z.ZodNumber>;
    content: z.ZodUnion<readonly [z.ZodObject<{
        text: z.ZodOptional<z.ZodString>;
        media: z.ZodOptional<z.ZodArray<z.ZodObject<{
            data: z.ZodUnion<readonly [z.ZodString, z.ZodCustom<Blob, Blob>]>;
            mimeType: z.ZodOptional<z.ZodString>;
            altText: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>, z.ZodArray<z.ZodObject<{
        text: z.ZodOptional<z.ZodString>;
        media: z.ZodOptional<z.ZodArray<z.ZodObject<{
            data: z.ZodUnion<readonly [z.ZodString, z.ZodCustom<Blob, Blob>]>;
            mimeType: z.ZodOptional<z.ZodString>;
            altText: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>]>;
}, z.core.$strip>;
export declare const DeletePostInputSchema: z.ZodObject<{
    userId: z.ZodString;
    accessToken: z.ZodString;
    refreshToken: z.ZodOptional<z.ZodString>;
    expiresAt: z.ZodOptional<z.ZodNumber>;
    postId: z.ZodString;
}, z.core.$strip>;
export declare const RepostInputSchema: z.ZodObject<{
    userId: z.ZodString;
    accessToken: z.ZodString;
    refreshToken: z.ZodOptional<z.ZodString>;
    expiresAt: z.ZodOptional<z.ZodNumber>;
    postId: z.ZodString;
}, z.core.$strip>;
export declare const QuotePostInputSchema: z.ZodObject<{
    userId: z.ZodString;
    accessToken: z.ZodString;
    refreshToken: z.ZodOptional<z.ZodString>;
    expiresAt: z.ZodOptional<z.ZodNumber>;
    postId: z.ZodString;
    content: z.ZodUnion<readonly [z.ZodObject<{
        text: z.ZodOptional<z.ZodString>;
        media: z.ZodOptional<z.ZodArray<z.ZodObject<{
            data: z.ZodUnion<readonly [z.ZodString, z.ZodCustom<Blob, Blob>]>;
            mimeType: z.ZodOptional<z.ZodString>;
            altText: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>, z.ZodArray<z.ZodObject<{
        text: z.ZodOptional<z.ZodString>;
        media: z.ZodOptional<z.ZodArray<z.ZodObject<{
            data: z.ZodUnion<readonly [z.ZodString, z.ZodCustom<Blob, Blob>]>;
            mimeType: z.ZodOptional<z.ZodString>;
            altText: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>]>;
}, z.core.$strip>;
export declare const ReplyInputSchema: z.ZodObject<{
    userId: z.ZodString;
    accessToken: z.ZodString;
    refreshToken: z.ZodOptional<z.ZodString>;
    expiresAt: z.ZodOptional<z.ZodNumber>;
    postId: z.ZodString;
    content: z.ZodUnion<readonly [z.ZodObject<{
        text: z.ZodOptional<z.ZodString>;
        media: z.ZodOptional<z.ZodArray<z.ZodObject<{
            data: z.ZodUnion<readonly [z.ZodString, z.ZodCustom<Blob, Blob>]>;
            mimeType: z.ZodOptional<z.ZodString>;
            altText: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>, z.ZodArray<z.ZodObject<{
        text: z.ZodOptional<z.ZodString>;
        media: z.ZodOptional<z.ZodArray<z.ZodObject<{
            data: z.ZodUnion<readonly [z.ZodString, z.ZodCustom<Blob, Blob>]>;
            mimeType: z.ZodOptional<z.ZodString>;
            altText: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>]>;
}, z.core.$strip>;
export declare const LikeInputSchema: z.ZodObject<{
    userId: z.ZodString;
    accessToken: z.ZodString;
    refreshToken: z.ZodOptional<z.ZodString>;
    expiresAt: z.ZodOptional<z.ZodNumber>;
    postId: z.ZodString;
}, z.core.$strip>;
export declare const UnlikeInputSchema: z.ZodObject<{
    userId: z.ZodString;
    accessToken: z.ZodString;
    refreshToken: z.ZodOptional<z.ZodString>;
    expiresAt: z.ZodOptional<z.ZodNumber>;
    postId: z.ZodString;
}, z.core.$strip>;
export declare const PostResultSchema: z.ZodObject<{
    id: z.ZodString;
    text: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
    mediaIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    threadIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    quotedPostId: z.ZodOptional<z.ZodString>;
    inReplyToId: z.ZodOptional<z.ZodString>;
    success: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const DeleteResultSchema: z.ZodObject<{
    success: z.ZodBoolean;
    id: z.ZodString;
}, z.core.$strip>;
export declare const LikeResultSchema: z.ZodObject<{
    success: z.ZodBoolean;
    id: z.ZodString;
}, z.core.$strip>;
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
