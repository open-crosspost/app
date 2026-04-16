import { z } from "zod";
import { PlatformSchema } from "./platform";

export const UserProfileSchema = z.object({
  userId: z.string(),
  username: z.string(),
  url: z.string().optional(),
  profileImageUrl: z.string(),
  isPremium: z.boolean().optional(),
  platform: PlatformSchema,
  lastUpdated: z.number(),
});

export const ConnectedAccountSchema = z.object({
  platform: PlatformSchema,
  userId: z.string(),
  connectedAt: z.string(),
  profile: UserProfileSchema.nullable(),
  error: z.string().optional(),
});

export const ConnectedAccountsResponseSchema = z.object({
  accounts: z.array(ConnectedAccountSchema),
});

export const AuthStatusSchema = z.object({
  message: z.string(),
  code: z.string(),
  details: z.string().optional(),
});

export const AuthInitRequestSchema = z.object({
  successUrl: z.string().optional(),
  errorUrl: z.string().optional(),
  redirect: z.boolean().optional().default(true),
});

export const AuthUrlResponseSchema = z.object({
  url: z.string(),
});

export const AuthCallbackQuerySchema = z.object({
  code: z.string(),
  state: z.string(),
});

export const AuthCallbackResponseSchema = z.object({
  platform: PlatformSchema,
  userId: z.string(),
  redirectUrl: z.string().optional(),
  status: AuthStatusSchema,
});

export const AuthStatusParamsSchema = z.object({
  platform: z.string(),
  userId: z.string(),
});

export const AuthStatusResponseSchema = z.object({
  platform: PlatformSchema,
  userId: z.string(),
  authenticated: z.boolean(),
  tokenStatus: z.object({
    valid: z.boolean(),
    expired: z.boolean(),
    expiresAt: z.string().optional(),
  }),
});

export const AuthTokenRequestSchema = z.object({
  userId: z.string(),
});

export const AuthRevokeResponseSchema = z.object({
  platform: PlatformSchema,
  userId: z.string(),
});

export const NearAuthorizationRequestSchema = z.object({});

export const NearAuthorizationResponseSchema = z.object({
  signerId: z.string(),
  isAuthorized: z.boolean(),
});

export const NearAuthorizationStatusResponseSchema = z.object({
  signerId: z.string(),
  isAuthorized: z.boolean(),
  authorizedAt: z.string().optional(),
});

export const NearUnauthorizationResponseSchema = z.object({
  success: z.boolean(),
  nearAccount: z.string(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type ConnectedAccount = z.infer<typeof ConnectedAccountSchema>;
export type ConnectedAccountsResponse = z.infer<typeof ConnectedAccountsResponseSchema>;
export type AuthStatus = z.infer<typeof AuthStatusSchema>;
export type AuthInitRequest = z.infer<typeof AuthInitRequestSchema>;
export type AuthUrlResponse = z.infer<typeof AuthUrlResponseSchema>;
export type AuthCallbackQuery = z.infer<typeof AuthCallbackQuerySchema>;
export type AuthCallbackResponse = z.infer<typeof AuthCallbackResponseSchema>;
export type AuthStatusParams = z.infer<typeof AuthStatusParamsSchema>;
export type AuthStatusResponse = z.infer<typeof AuthStatusResponseSchema>;
export type AuthTokenRequest = z.infer<typeof AuthTokenRequestSchema>;
export type AuthRevokeResponse = z.infer<typeof AuthRevokeResponseSchema>;
export type NearAuthorizationRequest = z.infer<typeof NearAuthorizationRequestSchema>;
export type NearAuthorizationResponse = z.infer<typeof NearAuthorizationResponseSchema>;
export type NearAuthorizationStatusResponse = z.infer<typeof NearAuthorizationStatusResponseSchema>;
export type NearUnauthorizationResponse = z.infer<typeof NearUnauthorizationResponseSchema>;
