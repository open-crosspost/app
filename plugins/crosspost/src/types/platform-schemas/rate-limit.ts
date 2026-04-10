import { z } from "every-plugin/zod";

export const CheckRateLimitInputSchema = z.object({
  endpoint: z.string(),
});

export const RateLimitStatusSchema = z.object({
  limit: z.number(),
  remaining: z.number(),
  reset: z.number(),
  resetAfter: z.number(),
});

export type CheckRateLimitInput = z.infer<typeof CheckRateLimitInputSchema>;
export type RateLimitStatus = z.infer<typeof RateLimitStatusSchema>;
