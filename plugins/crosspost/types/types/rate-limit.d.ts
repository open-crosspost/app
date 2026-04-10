import { z } from "every-plugin/zod";
export declare const RateLimitStatusSchema: z.ZodObject<{
    limit: z.ZodNumber;
    remaining: z.ZodNumber;
    reset: z.ZodNumber;
    resetAfter: z.ZodNumber;
}, z.core.$strip>;
export declare const PlatformRateLimitSchema: z.ZodObject<{
    platform: z.ZodEnum<typeof import("./platform").Platform>;
    limits: z.ZodRecord<z.ZodString, z.ZodObject<{
        limit: z.ZodNumber;
        remaining: z.ZodNumber;
        reset: z.ZodNumber;
        resetAfter: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const UsageRateLimitSchema: z.ZodObject<{
    endpoint: z.ZodString;
    limit: z.ZodNumber;
    remaining: z.ZodNumber;
    reset: z.ZodNumber;
}, z.core.$strip>;
export declare const RateLimitEndpointSchema: z.ZodObject<{
    endpoint: z.ZodString;
    platform: z.ZodOptional<z.ZodEnum<typeof import("./platform").Platform>>;
}, z.core.$strip>;
export declare const RateLimitEndpointParamSchema: z.ZodObject<{
    endpoint: z.ZodString;
}, z.core.$strip>;
export declare const RateLimitResponseSchema: z.ZodObject<{
    limits: z.ZodArray<z.ZodObject<{
        platform: z.ZodEnum<typeof import("./platform").Platform>;
        limits: z.ZodRecord<z.ZodString, z.ZodObject<{
            limit: z.ZodNumber;
            remaining: z.ZodNumber;
            reset: z.ZodNumber;
            resetAfter: z.ZodNumber;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const EndpointRateLimitResponseSchema: z.ZodObject<{
    endpoint: z.ZodString;
    limit: z.ZodNumber;
    remaining: z.ZodNumber;
    reset: z.ZodNumber;
    platform: z.ZodOptional<z.ZodEnum<typeof import("./platform").Platform>>;
}, z.core.$strip>;
export declare const AllRateLimitsResponseSchema: z.ZodObject<{
    limits: z.ZodArray<z.ZodObject<{
        platform: z.ZodEnum<typeof import("./platform").Platform>;
        limits: z.ZodRecord<z.ZodString, z.ZodObject<{
            limit: z.ZodNumber;
            remaining: z.ZodNumber;
            reset: z.ZodNumber;
            resetAfter: z.ZodNumber;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type RateLimitStatus = z.infer<typeof RateLimitStatusSchema>;
export type PlatformRateLimit = z.infer<typeof PlatformRateLimitSchema>;
export type UsageRateLimit = z.infer<typeof UsageRateLimitSchema>;
export type RateLimitEndpoint = z.infer<typeof RateLimitEndpointSchema>;
export type RateLimitEndpointParam = z.infer<typeof RateLimitEndpointParamSchema>;
export type RateLimitResponse = z.infer<typeof RateLimitResponseSchema>;
export type EndpointRateLimitResponse = z.infer<typeof EndpointRateLimitResponseSchema>;
export type AllRateLimitsResponse = z.infer<typeof AllRateLimitsResponseSchema>;
