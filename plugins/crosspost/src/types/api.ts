import { z } from "zod";

export enum ApiErrorCode {
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_REQUEST = "INVALID_REQUEST",
  RATE_LIMITED = "RATE_LIMITED",
  NOT_FOUND = "NOT_FOUND",
  PLATFORM_ERROR = "PLATFORM_ERROR",
  PLATFORM_UNAVAILABLE = "PLATFORM_UNAVAILABLE",
  CONTENT_POLICY_VIOLATION = "CONTENT_POLICY_VIOLATION",
  DUPLICATE_CONTENT = "DUPLICATE_CONTENT",
  MEDIA_UPLOAD_FAILED = "MEDIA_UPLOAD_FAILED",
  MULTI_STATUS = "MULTI_STATUS",
  POST_CREATION_FAILED = "POST_CREATION_FAILED",
  THREAD_CREATION_FAILED = "THREAD_CREATION_FAILED",
  POST_DELETION_FAILED = "POST_DELETION_FAILED",
  POST_INTERACTION_FAILED = "POST_INTERACTION_FAILED",
  NETWORK_ERROR = "NETWORK_ERROR",
  INVALID_RESPONSE = "INVALID_RESPONSE",
  TOKEN_REFRESH_FAILED = "TOKEN_REFRESH_FAILED",
  PROFILE_REFRESH_FAILED = "PROFILE_REFRESH_FAILED",
}

export const ApiErrorCodeSchema = z.nativeEnum(ApiErrorCode);

export const ResponseMetaSchema = z.object({
  requestId: z.string(),
  timestamp: z.string(),
  rateLimit: z
    .object({
      remaining: z.number(),
      limit: z.number(),
      reset: z.number(),
    })
    .optional(),
  pagination: z
    .object({
      limit: z.number().optional(),
      offset: z.number().optional(),
      total: z.number().optional(),
    })
    .optional(),
});

export const ErrorDetailSchema = z.object({
  message: z.string(),
  code: z.string(),
  recoverable: z.boolean(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const SuccessDetailSchema = z.object({
  platform: z.string(),
  userId: z.string(),
  details: z.any(),
  status: z.literal("success"),
});

export const MultiStatusSummarySchema = z.object({
  total: z.number(),
  succeeded: z.number(),
  failed: z.number(),
});

export const MultiStatusDataSchema = z.object({
  summary: MultiStatusSummarySchema,
  results: z.array(SuccessDetailSchema),
  errors: z.array(ErrorDetailSchema),
});

export const HealthStatusSchema = z.object({
  status: z.string(),
  version: z.string().optional(),
  timestamp: z.string(),
});

export interface ApiResponse<T> {
  success: boolean;
  data?: T | null;
  errors?: z.infer<typeof ErrorDetailSchema>[] | null;
  meta: z.infer<typeof ResponseMetaSchema>;
}

export type ResponseMeta = z.infer<typeof ResponseMetaSchema>;
export type ErrorDetail = z.infer<typeof ErrorDetailSchema>;
export type SuccessDetail<T = any> = Omit<z.infer<typeof SuccessDetailSchema>, "details"> & {
  details?: T;
};
export type MultiStatusSummary = z.infer<typeof MultiStatusSummarySchema>;
export type MultiStatusData<TDetail = any> = {
  summary: MultiStatusSummary;
  results: SuccessDetail<TDetail>[];
  errors: ErrorDetail[];
};
export type HealthStatus = z.infer<typeof HealthStatusSchema>;
