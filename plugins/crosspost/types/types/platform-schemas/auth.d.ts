import { z } from "zod";
export declare const AuthenticatedRequestSchema: z.ZodObject<{
    userId: z.ZodString;
    accessToken: z.ZodString;
    refreshToken: z.ZodOptional<z.ZodString>;
    expiresAt: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const GetAuthUrlInputSchema: z.ZodObject<{
    redirectUri: z.ZodString;
    state: z.ZodString;
    scopes: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const ExchangeCodeInputSchema: z.ZodObject<{
    code: z.ZodString;
    redirectUri: z.ZodString;
    codeVerifier: z.ZodOptional<z.ZodString>;
    scopes: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const RefreshTokenInputSchema: z.ZodObject<{
    refreshToken: z.ZodString;
    scope: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const RevokeTokenInputSchema: z.ZodObject<{
    accessToken: z.ZodString;
    refreshToken: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const AuthTokenSchema: z.ZodObject<{
    accessToken: z.ZodString;
    refreshToken: z.ZodOptional<z.ZodString>;
    expiresAt: z.ZodNumber;
    scope: z.ZodOptional<z.ZodArray<z.ZodString>>;
    tokenType: z.ZodString;
}, z.core.$strip>;
export type AuthenticatedRequest = z.infer<typeof AuthenticatedRequestSchema>;
export type GetAuthUrlInput = z.infer<typeof GetAuthUrlInputSchema>;
export type ExchangeCodeInput = z.infer<typeof ExchangeCodeInputSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenInputSchema>;
export type RevokeTokenInput = z.infer<typeof RevokeTokenInputSchema>;
export type AuthToken = z.infer<typeof AuthTokenSchema>;
