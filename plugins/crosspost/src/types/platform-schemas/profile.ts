import { z } from "every-plugin/zod";
import { AuthenticatedRequestSchema } from "./auth";

export const GetProfileInputSchema = AuthenticatedRequestSchema;

export const UserProfileSchema = z.object({
  id: z.string(),
  username: z.string().optional(),
  displayName: z.string().optional(),
  bio: z.string().optional(),
  avatar: z.string().optional(),
  banner: z.string().optional(),
  followersCount: z.number().optional(),
  followingCount: z.number().optional(),
  postsCount: z.number().optional(),
  verified: z.boolean().optional(),
  createdAt: z.string().optional(),
});

export type GetProfileInput = z.infer<typeof GetProfileInputSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
