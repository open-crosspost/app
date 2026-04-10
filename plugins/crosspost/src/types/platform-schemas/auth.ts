import { z } from "zod";

export const AuthenticatedRequestSchema = z.object({
  userId: z.string(),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.number().optional(),
});

export const GetAuthUrlInputSchema = z.object({
  redirectUri: z.string().url(),
  state: z.string(),
  scopes: z.array(z.string()),
});

export const ExchangeCodeInputSchema = z.object({
  code: z.string(),
  redirectUri: z.string().url(),
  codeVerifier: z.string().optional(),
  scopes: z.array(z.string()),
});

export const RefreshTokenInputSchema = z.object({
  refreshToken: z.string(),
  scope: z.array(z.string()).optional(),
});

export const RevokeTokenInputSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
});

export const AuthTokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.number(),
  scope: z.array(z.string()).optional(),
  tokenType: z.string(),
});

export type AuthenticatedRequest = z.infer<typeof AuthenticatedRequestSchema>;
export type GetAuthUrlInput = z.infer<typeof GetAuthUrlInputSchema>;
export type ExchangeCodeInput = z.infer<typeof ExchangeCodeInputSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenInputSchema>;
export type RevokeTokenInput = z.infer<typeof RevokeTokenInputSchema>;
export type AuthToken = z.infer<typeof AuthTokenSchema>;
