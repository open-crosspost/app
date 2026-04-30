import { z } from "zod";
import { PlatformSchema } from "./platform";

export const RateLimitStatusSchema = z.object({
  limit: z.number(),
  remaining: z.number(),
  reset: z.number(),
  resetAfter: z.number(),
});

export const PlatformRateLimitSchema = z.object({
  platform: PlatformSchema,
  limits: z.record(z.string(), RateLimitStatusSchema),
});

export const UsageRateLimitSchema = z.object({
  endpoint: z.string(),
  limit: z.number(),
  remaining: z.number(),
  reset: z.number(),
});

export const RateLimitEndpointSchema = z.object({
  endpoint: z.string(),
  platform: PlatformSchema.optional(),
});

export const RateLimitEndpointParamSchema = z.object({
  endpoint: z.string(),
});

export const RateLimitResponseSchema = z.object({
  limits: z.array(PlatformRateLimitSchema),
});

export const EndpointRateLimitResponseSchema = z.object({
  endpoint: z.string(),
  limit: z.number(),
  remaining: z.number(),
  reset: z.number(),
  platform: PlatformSchema.optional(),
});

export const AllRateLimitsResponseSchema = z.object({
  limits: z.array(PlatformRateLimitSchema),
});

export type RateLimitStatus = z.infer<typeof RateLimitStatusSchema>;
export type PlatformRateLimit = z.infer<typeof PlatformRateLimitSchema>;
export type UsageRateLimit = z.infer<typeof UsageRateLimitSchema>;
export type RateLimitEndpoint = z.infer<typeof RateLimitEndpointSchema>;
export type RateLimitEndpointParam = z.infer<typeof RateLimitEndpointParamSchema>;
export type RateLimitResponse = z.infer<typeof RateLimitResponseSchema>;
export type EndpointRateLimitResponse = z.infer<typeof EndpointRateLimitResponseSchema>;
export type AllRateLimitsResponse = z.infer<typeof AllRateLimitsResponseSchema>;
