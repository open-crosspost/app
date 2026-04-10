import { z } from "every-plugin/zod";
export declare const MediaContentSchema: z.ZodObject<{
    data: z.ZodUnion<readonly [z.ZodString, z.ZodCustom<Blob, Blob>]>;
    mimeType: z.ZodOptional<z.ZodString>;
    altText: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const MediaSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<{
        image: "image";
        video: "video";
        gif: "gif";
    }>;
    url: z.ZodOptional<z.ZodString>;
    altText: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const PostMetricsSchema: z.ZodObject<{
    retweets: z.ZodNumber;
    quotes: z.ZodNumber;
    likes: z.ZodNumber;
    replies: z.ZodNumber;
}, z.core.$strip>;
export declare const PostSchema: z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    createdAt: z.ZodString;
    authorId: z.ZodString;
    media: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<{
            image: "image";
            video: "video";
            gif: "gif";
        }>;
        url: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    metrics: z.ZodOptional<z.ZodObject<{
        retweets: z.ZodNumber;
        quotes: z.ZodNumber;
        likes: z.ZodNumber;
        replies: z.ZodNumber;
    }, z.core.$strip>>;
    inReplyToId: z.ZodOptional<z.ZodString>;
    quotedPostId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const PostContentSchema: z.ZodObject<{
    text: z.ZodOptional<z.ZodString>;
    media: z.ZodOptional<z.ZodArray<z.ZodObject<{
        data: z.ZodUnion<readonly [z.ZodString, z.ZodCustom<Blob, Blob>]>;
        mimeType: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
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
export declare const TargetSchema: z.ZodObject<{
    platform: z.ZodEnum<typeof import("./platform").Platform>;
    userId: z.ZodString;
}, z.core.$strip>;
export declare const CreatePostRequestSchema: z.ZodObject<{
    targets: z.ZodArray<z.ZodObject<{
        platform: z.ZodEnum<typeof import("./platform").Platform>;
        userId: z.ZodString;
    }, z.core.$strip>>;
    content: z.ZodArray<z.ZodObject<{
        text: z.ZodOptional<z.ZodString>;
        media: z.ZodOptional<z.ZodArray<z.ZodObject<{
            data: z.ZodUnion<readonly [z.ZodString, z.ZodCustom<Blob, Blob>]>;
            mimeType: z.ZodOptional<z.ZodString>;
            altText: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const RepostRequestSchema: z.ZodObject<{
    targets: z.ZodArray<z.ZodObject<{
        platform: z.ZodEnum<typeof import("./platform").Platform>;
        userId: z.ZodString;
    }, z.core.$strip>>;
    platform: z.ZodEnum<typeof import("./platform").Platform>;
    postId: z.ZodString;
}, z.core.$strip>;
export declare const QuotePostRequestSchema: z.ZodObject<{
    targets: z.ZodArray<z.ZodObject<{
        platform: z.ZodEnum<typeof import("./platform").Platform>;
        userId: z.ZodString;
    }, z.core.$strip>>;
    platform: z.ZodEnum<typeof import("./platform").Platform>;
    postId: z.ZodString;
    content: z.ZodArray<z.ZodObject<{
        text: z.ZodOptional<z.ZodString>;
        media: z.ZodOptional<z.ZodArray<z.ZodObject<{
            data: z.ZodUnion<readonly [z.ZodString, z.ZodCustom<Blob, Blob>]>;
            mimeType: z.ZodOptional<z.ZodString>;
            altText: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const ReplyToPostRequestSchema: z.ZodObject<{
    targets: z.ZodArray<z.ZodObject<{
        platform: z.ZodEnum<typeof import("./platform").Platform>;
        userId: z.ZodString;
    }, z.core.$strip>>;
    platform: z.ZodEnum<typeof import("./platform").Platform>;
    postId: z.ZodString;
    content: z.ZodArray<z.ZodObject<{
        text: z.ZodOptional<z.ZodString>;
        media: z.ZodOptional<z.ZodArray<z.ZodObject<{
            data: z.ZodUnion<readonly [z.ZodString, z.ZodCustom<Blob, Blob>]>;
            mimeType: z.ZodOptional<z.ZodString>;
            altText: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const PostToDeleteSchema: z.ZodObject<{
    platform: z.ZodEnum<typeof import("./platform").Platform>;
    userId: z.ZodString;
    postId: z.ZodString;
}, z.core.$strip>;
export declare const DeletePostRequestSchema: z.ZodObject<{
    targets: z.ZodArray<z.ZodObject<{
        platform: z.ZodEnum<typeof import("./platform").Platform>;
        userId: z.ZodString;
    }, z.core.$strip>>;
    posts: z.ZodArray<z.ZodObject<{
        platform: z.ZodEnum<typeof import("./platform").Platform>;
        userId: z.ZodString;
        postId: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const LikePostRequestSchema: z.ZodObject<{
    targets: z.ZodArray<z.ZodObject<{
        platform: z.ZodEnum<typeof import("./platform").Platform>;
        userId: z.ZodString;
    }, z.core.$strip>>;
    platform: z.ZodEnum<typeof import("./platform").Platform>;
    postId: z.ZodString;
}, z.core.$strip>;
export declare const UnlikePostRequestSchema: z.ZodObject<{
    targets: z.ZodArray<z.ZodObject<{
        platform: z.ZodEnum<typeof import("./platform").Platform>;
        userId: z.ZodString;
    }, z.core.$strip>>;
    platform: z.ZodEnum<typeof import("./platform").Platform>;
    postId: z.ZodString;
}, z.core.$strip>;
export declare const PostResponseSchema: z.ZodUnion<readonly [z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    createdAt: z.ZodString;
    authorId: z.ZodString;
    media: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<{
            image: "image";
            video: "video";
            gif: "gif";
        }>;
        url: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    metrics: z.ZodOptional<z.ZodObject<{
        retweets: z.ZodNumber;
        quotes: z.ZodNumber;
        likes: z.ZodNumber;
        replies: z.ZodNumber;
    }, z.core.$strip>>;
    inReplyToId: z.ZodOptional<z.ZodString>;
    quotedPostId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    createdAt: z.ZodString;
    authorId: z.ZodString;
    media: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<{
            image: "image";
            video: "video";
            gif: "gif";
        }>;
        url: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    metrics: z.ZodOptional<z.ZodObject<{
        retweets: z.ZodNumber;
        quotes: z.ZodNumber;
        likes: z.ZodNumber;
        replies: z.ZodNumber;
    }, z.core.$strip>>;
    inReplyToId: z.ZodOptional<z.ZodString>;
    quotedPostId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>>]>;
export declare const CreatePostResponseSchema: z.ZodUnion<readonly [z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    createdAt: z.ZodString;
    authorId: z.ZodString;
    media: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<{
            image: "image";
            video: "video";
            gif: "gif";
        }>;
        url: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    metrics: z.ZodOptional<z.ZodObject<{
        retweets: z.ZodNumber;
        quotes: z.ZodNumber;
        likes: z.ZodNumber;
        replies: z.ZodNumber;
    }, z.core.$strip>>;
    inReplyToId: z.ZodOptional<z.ZodString>;
    quotedPostId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    createdAt: z.ZodString;
    authorId: z.ZodString;
    media: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<{
            image: "image";
            video: "video";
            gif: "gif";
        }>;
        url: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    metrics: z.ZodOptional<z.ZodObject<{
        retweets: z.ZodNumber;
        quotes: z.ZodNumber;
        likes: z.ZodNumber;
        replies: z.ZodNumber;
    }, z.core.$strip>>;
    inReplyToId: z.ZodOptional<z.ZodString>;
    quotedPostId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>>]>;
export declare const RepostResponseSchema: z.ZodUnion<readonly [z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    createdAt: z.ZodString;
    authorId: z.ZodString;
    media: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<{
            image: "image";
            video: "video";
            gif: "gif";
        }>;
        url: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    metrics: z.ZodOptional<z.ZodObject<{
        retweets: z.ZodNumber;
        quotes: z.ZodNumber;
        likes: z.ZodNumber;
        replies: z.ZodNumber;
    }, z.core.$strip>>;
    inReplyToId: z.ZodOptional<z.ZodString>;
    quotedPostId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    createdAt: z.ZodString;
    authorId: z.ZodString;
    media: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<{
            image: "image";
            video: "video";
            gif: "gif";
        }>;
        url: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    metrics: z.ZodOptional<z.ZodObject<{
        retweets: z.ZodNumber;
        quotes: z.ZodNumber;
        likes: z.ZodNumber;
        replies: z.ZodNumber;
    }, z.core.$strip>>;
    inReplyToId: z.ZodOptional<z.ZodString>;
    quotedPostId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>>]>;
export declare const QuotePostResponseSchema: z.ZodUnion<readonly [z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    createdAt: z.ZodString;
    authorId: z.ZodString;
    media: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<{
            image: "image";
            video: "video";
            gif: "gif";
        }>;
        url: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    metrics: z.ZodOptional<z.ZodObject<{
        retweets: z.ZodNumber;
        quotes: z.ZodNumber;
        likes: z.ZodNumber;
        replies: z.ZodNumber;
    }, z.core.$strip>>;
    inReplyToId: z.ZodOptional<z.ZodString>;
    quotedPostId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    createdAt: z.ZodString;
    authorId: z.ZodString;
    media: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<{
            image: "image";
            video: "video";
            gif: "gif";
        }>;
        url: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    metrics: z.ZodOptional<z.ZodObject<{
        retweets: z.ZodNumber;
        quotes: z.ZodNumber;
        likes: z.ZodNumber;
        replies: z.ZodNumber;
    }, z.core.$strip>>;
    inReplyToId: z.ZodOptional<z.ZodString>;
    quotedPostId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>>]>;
export declare const ReplyToPostResponseSchema: z.ZodUnion<readonly [z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    createdAt: z.ZodString;
    authorId: z.ZodString;
    media: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<{
            image: "image";
            video: "video";
            gif: "gif";
        }>;
        url: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    metrics: z.ZodOptional<z.ZodObject<{
        retweets: z.ZodNumber;
        quotes: z.ZodNumber;
        likes: z.ZodNumber;
        replies: z.ZodNumber;
    }, z.core.$strip>>;
    inReplyToId: z.ZodOptional<z.ZodString>;
    quotedPostId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    createdAt: z.ZodString;
    authorId: z.ZodString;
    media: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<{
            image: "image";
            video: "video";
            gif: "gif";
        }>;
        url: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    metrics: z.ZodOptional<z.ZodObject<{
        retweets: z.ZodNumber;
        quotes: z.ZodNumber;
        likes: z.ZodNumber;
        replies: z.ZodNumber;
    }, z.core.$strip>>;
    inReplyToId: z.ZodOptional<z.ZodString>;
    quotedPostId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>>]>;
export declare const DeletePostResponseSchema: z.ZodUnion<readonly [z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    createdAt: z.ZodString;
    authorId: z.ZodString;
    media: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<{
            image: "image";
            video: "video";
            gif: "gif";
        }>;
        url: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    metrics: z.ZodOptional<z.ZodObject<{
        retweets: z.ZodNumber;
        quotes: z.ZodNumber;
        likes: z.ZodNumber;
        replies: z.ZodNumber;
    }, z.core.$strip>>;
    inReplyToId: z.ZodOptional<z.ZodString>;
    quotedPostId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    createdAt: z.ZodString;
    authorId: z.ZodString;
    media: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<{
            image: "image";
            video: "video";
            gif: "gif";
        }>;
        url: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    metrics: z.ZodOptional<z.ZodObject<{
        retweets: z.ZodNumber;
        quotes: z.ZodNumber;
        likes: z.ZodNumber;
        replies: z.ZodNumber;
    }, z.core.$strip>>;
    inReplyToId: z.ZodOptional<z.ZodString>;
    quotedPostId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>>]>;
export declare const LikePostResponseSchema: z.ZodUnion<readonly [z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    createdAt: z.ZodString;
    authorId: z.ZodString;
    media: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<{
            image: "image";
            video: "video";
            gif: "gif";
        }>;
        url: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    metrics: z.ZodOptional<z.ZodObject<{
        retweets: z.ZodNumber;
        quotes: z.ZodNumber;
        likes: z.ZodNumber;
        replies: z.ZodNumber;
    }, z.core.$strip>>;
    inReplyToId: z.ZodOptional<z.ZodString>;
    quotedPostId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    createdAt: z.ZodString;
    authorId: z.ZodString;
    media: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<{
            image: "image";
            video: "video";
            gif: "gif";
        }>;
        url: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    metrics: z.ZodOptional<z.ZodObject<{
        retweets: z.ZodNumber;
        quotes: z.ZodNumber;
        likes: z.ZodNumber;
        replies: z.ZodNumber;
    }, z.core.$strip>>;
    inReplyToId: z.ZodOptional<z.ZodString>;
    quotedPostId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>>]>;
export declare const UnlikePostResponseSchema: z.ZodUnion<readonly [z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    createdAt: z.ZodString;
    authorId: z.ZodString;
    media: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<{
            image: "image";
            video: "video";
            gif: "gif";
        }>;
        url: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    metrics: z.ZodOptional<z.ZodObject<{
        retweets: z.ZodNumber;
        quotes: z.ZodNumber;
        likes: z.ZodNumber;
        replies: z.ZodNumber;
    }, z.core.$strip>>;
    inReplyToId: z.ZodOptional<z.ZodString>;
    quotedPostId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    createdAt: z.ZodString;
    authorId: z.ZodString;
    media: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<{
            image: "image";
            video: "video";
            gif: "gif";
        }>;
        url: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    metrics: z.ZodOptional<z.ZodObject<{
        retweets: z.ZodNumber;
        quotes: z.ZodNumber;
        likes: z.ZodNumber;
        replies: z.ZodNumber;
    }, z.core.$strip>>;
    inReplyToId: z.ZodOptional<z.ZodString>;
    quotedPostId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>>]>;
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
