import { z } from "every-plugin/zod";
export declare const CheckRateLimitInputSchema: z.ZodObject<{
    endpoint: z.ZodString;
}, z.core.$strip>;
export declare const RateLimitStatusSchema: z.ZodObject<{
    limit: z.ZodNumber;
    remaining: z.ZodNumber;
    reset: z.ZodNumber;
    resetAfter: z.ZodNumber;
}, z.core.$strip>;
export type CheckRateLimitInput = z.infer<typeof CheckRateLimitInputSchema>;
export type RateLimitStatus = z.infer<typeof RateLimitStatusSchema>;
