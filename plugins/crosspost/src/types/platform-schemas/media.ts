import { z } from "every-plugin/zod";
import { AuthenticatedRequestSchema } from "./auth";

export const UploadMediaInputSchema = AuthenticatedRequestSchema.extend({
  media: z.object({
    data: z.union([z.string(), z.instanceof(Blob)]),
    mimeType: z.string().optional(),
    altText: z.string().optional(),
  }),
  additionalOwners: z.array(z.string()).optional(),
});

export const GetMediaStatusInputSchema = AuthenticatedRequestSchema.extend({
  mediaId: z.string(),
});

export const UpdateMediaMetadataInputSchema = AuthenticatedRequestSchema.extend({
  mediaId: z.string(),
  altText: z.string(),
});

export const MediaUploadResultSchema = z.object({
  mediaId: z.string(),
  processingInfo: z
    .object({
      state: z.string(),
      checkAfterSecs: z.number().optional(),
      progressPercent: z.number().optional(),
      error: z
        .object({
          code: z.string(),
          message: z.string(),
        })
        .optional(),
    })
    .optional(),
});

export const MediaStatusResultSchema = z.object({
  mediaId: z.string(),
  state: z.string(),
  processingComplete: z.boolean(),
  progressPercent: z.number().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
});

export type UploadMediaInput = z.infer<typeof UploadMediaInputSchema>;
export type GetMediaStatusInput = z.infer<typeof GetMediaStatusInputSchema>;
export type UpdateMediaMetadataInput = z.infer<typeof UpdateMediaMetadataInputSchema>;
export type MediaUploadResult = z.infer<typeof MediaUploadResultSchema>;
export type MediaStatusResult = z.infer<typeof MediaStatusResultSchema>;
