import { z } from "every-plugin/zod";
export declare const UserProfileSchema: z.ZodObject<{
    userId: z.ZodString;
    username: z.ZodString;
    url: z.ZodOptional<z.ZodString>;
    profileImageUrl: z.ZodString;
    isPremium: z.ZodOptional<z.ZodBoolean>;
    platform: z.ZodEnum<typeof import("./platform").Platform>;
    lastUpdated: z.ZodNumber;
}, z.core.$strip>;
export declare const ConnectedAccountSchema: z.ZodObject<{
    platform: z.ZodEnum<typeof import("./platform").Platform>;
    userId: z.ZodString;
    connectedAt: z.ZodString;
    profile: z.ZodNullable<z.ZodObject<{
        userId: z.ZodString;
        username: z.ZodString;
        url: z.ZodOptional<z.ZodString>;
        profileImageUrl: z.ZodString;
        isPremium: z.ZodOptional<z.ZodBoolean>;
        platform: z.ZodEnum<typeof import("./platform").Platform>;
        lastUpdated: z.ZodNumber;
    }, z.core.$strip>>;
    error: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const ConnectedAccountsResponseSchema: z.ZodObject<{
    accounts: z.ZodArray<z.ZodObject<{
        platform: z.ZodEnum<typeof import("./platform").Platform>;
        userId: z.ZodString;
        connectedAt: z.ZodString;
        profile: z.ZodNullable<z.ZodObject<{
            userId: z.ZodString;
            username: z.ZodString;
            url: z.ZodOptional<z.ZodString>;
            profileImageUrl: z.ZodString;
            isPremium: z.ZodOptional<z.ZodBoolean>;
            platform: z.ZodEnum<typeof import("./platform").Platform>;
            lastUpdated: z.ZodNumber;
        }, z.core.$strip>>;
        error: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const AuthStatusSchema: z.ZodObject<{
    message: z.ZodString;
    code: z.ZodString;
    details: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const AuthInitRequestSchema: z.ZodObject<{
    successUrl: z.ZodOptional<z.ZodString>;
    errorUrl: z.ZodOptional<z.ZodString>;
    redirect: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const AuthUrlResponseSchema: z.ZodObject<{
    url: z.ZodString;
}, z.core.$strip>;
export declare const AuthCallbackQuerySchema: z.ZodObject<{
    code: z.ZodString;
    state: z.ZodString;
}, z.core.$strip>;
export declare const AuthCallbackResponseSchema: z.ZodObject<{
    platform: z.ZodEnum<typeof import("./platform").Platform>;
    userId: z.ZodString;
    redirectUrl: z.ZodOptional<z.ZodString>;
    status: z.ZodObject<{
        message: z.ZodString;
        code: z.ZodString;
        details: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const AuthStatusParamsSchema: z.ZodObject<{
    platform: z.ZodString;
    userId: z.ZodString;
}, z.core.$strip>;
export declare const AuthStatusResponseSchema: z.ZodObject<{
    platform: z.ZodEnum<typeof import("./platform").Platform>;
    userId: z.ZodString;
    authenticated: z.ZodBoolean;
    tokenStatus: z.ZodObject<{
        valid: z.ZodBoolean;
        expired: z.ZodBoolean;
        expiresAt: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const AuthTokenRequestSchema: z.ZodObject<{
    userId: z.ZodString;
}, z.core.$strip>;
export declare const AuthRevokeResponseSchema: z.ZodObject<{
    platform: z.ZodEnum<typeof import("./platform").Platform>;
    userId: z.ZodString;
}, z.core.$strip>;
export declare const NearAuthorizationRequestSchema: z.ZodObject<{}, z.core.$strip>;
export declare const NearAuthorizationResponseSchema: z.ZodObject<{
    signerId: z.ZodString;
    isAuthorized: z.ZodBoolean;
}, z.core.$strip>;
export declare const NearAuthorizationStatusResponseSchema: z.ZodObject<{
    signerId: z.ZodString;
    isAuthorized: z.ZodBoolean;
    authorizedAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const NearUnauthorizationResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    nearAccount: z.ZodString;
}, z.core.$strip>;
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
