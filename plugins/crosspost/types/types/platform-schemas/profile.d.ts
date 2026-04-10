import { z } from "every-plugin/zod";
export declare const GetProfileInputSchema: z.ZodObject<{
    userId: z.ZodString;
    accessToken: z.ZodString;
    refreshToken: z.ZodOptional<z.ZodString>;
    expiresAt: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const UserProfileSchema: z.ZodObject<{
    id: z.ZodString;
    username: z.ZodOptional<z.ZodString>;
    displayName: z.ZodOptional<z.ZodString>;
    bio: z.ZodOptional<z.ZodString>;
    avatar: z.ZodOptional<z.ZodString>;
    banner: z.ZodOptional<z.ZodString>;
    followersCount: z.ZodOptional<z.ZodNumber>;
    followingCount: z.ZodOptional<z.ZodNumber>;
    postsCount: z.ZodOptional<z.ZodNumber>;
    verified: z.ZodOptional<z.ZodBoolean>;
    createdAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type GetProfileInput = z.infer<typeof GetProfileInputSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
