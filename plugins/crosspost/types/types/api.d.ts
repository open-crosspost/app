import { z } from "zod";
export declare enum ApiErrorCode {
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
    PROFILE_REFRESH_FAILED = "PROFILE_REFRESH_FAILED"
}
export declare const ApiErrorCodeSchema: z.ZodEnum<typeof ApiErrorCode>;
export declare const ResponseMetaSchema: z.ZodObject<{
    requestId: z.ZodString;
    timestamp: z.ZodString;
    rateLimit: z.ZodOptional<z.ZodObject<{
        remaining: z.ZodNumber;
        limit: z.ZodNumber;
        reset: z.ZodNumber;
    }, z.core.$strip>>;
    pagination: z.ZodOptional<z.ZodObject<{
        limit: z.ZodOptional<z.ZodNumber>;
        offset: z.ZodOptional<z.ZodNumber>;
        total: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const ErrorDetailSchema: z.ZodObject<{
    message: z.ZodString;
    code: z.ZodString;
    recoverable: z.ZodBoolean;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export declare const SuccessDetailSchema: z.ZodObject<{
    platform: z.ZodString;
    userId: z.ZodString;
    details: z.ZodAny;
    status: z.ZodLiteral<"success">;
}, z.core.$strip>;
export declare const MultiStatusSummarySchema: z.ZodObject<{
    total: z.ZodNumber;
    succeeded: z.ZodNumber;
    failed: z.ZodNumber;
}, z.core.$strip>;
export declare const MultiStatusDataSchema: z.ZodObject<{
    summary: z.ZodObject<{
        total: z.ZodNumber;
        succeeded: z.ZodNumber;
        failed: z.ZodNumber;
    }, z.core.$strip>;
    results: z.ZodArray<z.ZodObject<{
        platform: z.ZodString;
        userId: z.ZodString;
        details: z.ZodAny;
        status: z.ZodLiteral<"success">;
    }, z.core.$strip>>;
    errors: z.ZodArray<z.ZodObject<{
        message: z.ZodString;
        code: z.ZodString;
        recoverable: z.ZodBoolean;
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const HealthStatusSchema: z.ZodObject<{
    status: z.ZodString;
    version: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodString;
}, z.core.$strip>;
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
