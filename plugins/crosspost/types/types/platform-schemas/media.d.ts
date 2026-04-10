import { z } from "zod";
export declare const UploadMediaInputSchema: z.ZodObject<{
    userId: z.ZodString;
    accessToken: z.ZodString;
    refreshToken: z.ZodOptional<z.ZodString>;
    expiresAt: z.ZodOptional<z.ZodNumber>;
    media: z.ZodObject<{
        data: z.ZodUnion<readonly [z.ZodString, z.ZodCustom<Blob, Blob>]>;
        mimeType: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    additionalOwners: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const GetMediaStatusInputSchema: z.ZodObject<{
    userId: z.ZodString;
    accessToken: z.ZodString;
    refreshToken: z.ZodOptional<z.ZodString>;
    expiresAt: z.ZodOptional<z.ZodNumber>;
    mediaId: z.ZodString;
}, z.core.$strip>;
export declare const UpdateMediaMetadataInputSchema: z.ZodObject<{
    userId: z.ZodString;
    accessToken: z.ZodString;
    refreshToken: z.ZodOptional<z.ZodString>;
    expiresAt: z.ZodOptional<z.ZodNumber>;
    mediaId: z.ZodString;
    altText: z.ZodString;
}, z.core.$strip>;
export declare const MediaUploadResultSchema: z.ZodObject<{
    mediaId: z.ZodString;
    processingInfo: z.ZodOptional<z.ZodObject<{
        state: z.ZodString;
        checkAfterSecs: z.ZodOptional<z.ZodNumber>;
        progressPercent: z.ZodOptional<z.ZodNumber>;
        error: z.ZodOptional<z.ZodObject<{
            code: z.ZodString;
            message: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const MediaStatusResultSchema: z.ZodObject<{
    mediaId: z.ZodString;
    state: z.ZodString;
    processingComplete: z.ZodBoolean;
    progressPercent: z.ZodOptional<z.ZodNumber>;
    error: z.ZodOptional<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type UploadMediaInput = z.infer<typeof UploadMediaInputSchema>;
export type GetMediaStatusInput = z.infer<typeof GetMediaStatusInputSchema>;
export type UpdateMediaMetadataInput = z.infer<typeof UpdateMediaMetadataInputSchema>;
export type MediaUploadResult = z.infer<typeof MediaUploadResultSchema>;
export type MediaStatusResult = z.infer<typeof MediaStatusResultSchema>;
