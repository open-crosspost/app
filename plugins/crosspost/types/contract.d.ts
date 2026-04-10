import { z } from "every-plugin/zod";
import * as Types from "./types";
export declare const contract: {
    auth: {
        authorizeNearAccount: import("@orpc/contract").ContractProcedure<z.ZodObject<{}, z.core.$strip>, z.ZodObject<{
            signerId: z.ZodString;
            isAuthorized: z.ZodBoolean;
        }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
            readonly UNAUTHORIZED: {
                readonly status: 401;
                readonly data: z.ZodObject<{
                    apiKeyProvided: z.ZodBoolean;
                    provider: z.ZodOptional<z.ZodString>;
                    authType: z.ZodOptional<z.ZodEnum<{
                        apiKey: "apiKey";
                        oauth: "oauth";
                        token: "token";
                    }>>;
                }, z.core.$strip>;
            };
            readonly RATE_LIMITED: {
                readonly status: 429;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodNumber;
                    remainingRequests: z.ZodOptional<z.ZodNumber>;
                    resetTime: z.ZodOptional<z.ZodString>;
                    limitType: z.ZodOptional<z.ZodEnum<{
                        requests: "requests";
                        tokens: "tokens";
                        bandwidth: "bandwidth";
                    }>>;
                }, z.core.$strip>;
            };
            readonly SERVICE_UNAVAILABLE: {
                readonly status: 503;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodOptional<z.ZodNumber>;
                    maintenanceWindow: z.ZodDefault<z.ZodBoolean>;
                    estimatedUptime: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly BAD_REQUEST: {
                readonly status: 400;
                readonly data: z.ZodObject<{
                    invalidFields: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    validationErrors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        message: z.ZodString;
                        code: z.ZodOptional<z.ZodString>;
                    }, z.core.$strip>>>;
                }, z.core.$strip>;
            };
            readonly NOT_FOUND: {
                readonly status: 404;
                readonly data: z.ZodObject<{
                    resource: z.ZodOptional<z.ZodString>;
                    resourceId: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly FORBIDDEN: {
                readonly status: 403;
                readonly data: z.ZodObject<{
                    requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    action: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly TIMEOUT: {
                readonly status: 504;
                readonly data: z.ZodObject<{
                    timeoutMs: z.ZodOptional<z.ZodNumber>;
                    operation: z.ZodOptional<z.ZodString>;
                    retryable: z.ZodDefault<z.ZodBoolean>;
                }, z.core.$strip>;
            };
            readonly CONNECTION_ERROR: {
                readonly status: 502;
                readonly data: z.ZodObject<{
                    errorCode: z.ZodOptional<z.ZodString>;
                    host: z.ZodOptional<z.ZodString>;
                    port: z.ZodOptional<z.ZodNumber>;
                    suggestion: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
        }>>>, Record<never, never>>;
        getNearAuthorizationStatus: import("@orpc/contract").ContractProcedure<import("@orpc/contract").Schema<unknown, unknown>, z.ZodObject<{
            signerId: z.ZodString;
            isAuthorized: z.ZodBoolean;
            authorizedAt: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
            readonly UNAUTHORIZED: {
                readonly status: 401;
                readonly data: z.ZodObject<{
                    apiKeyProvided: z.ZodBoolean;
                    provider: z.ZodOptional<z.ZodString>;
                    authType: z.ZodOptional<z.ZodEnum<{
                        apiKey: "apiKey";
                        oauth: "oauth";
                        token: "token";
                    }>>;
                }, z.core.$strip>;
            };
            readonly RATE_LIMITED: {
                readonly status: 429;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodNumber;
                    remainingRequests: z.ZodOptional<z.ZodNumber>;
                    resetTime: z.ZodOptional<z.ZodString>;
                    limitType: z.ZodOptional<z.ZodEnum<{
                        requests: "requests";
                        tokens: "tokens";
                        bandwidth: "bandwidth";
                    }>>;
                }, z.core.$strip>;
            };
            readonly SERVICE_UNAVAILABLE: {
                readonly status: 503;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodOptional<z.ZodNumber>;
                    maintenanceWindow: z.ZodDefault<z.ZodBoolean>;
                    estimatedUptime: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly BAD_REQUEST: {
                readonly status: 400;
                readonly data: z.ZodObject<{
                    invalidFields: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    validationErrors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        message: z.ZodString;
                        code: z.ZodOptional<z.ZodString>;
                    }, z.core.$strip>>>;
                }, z.core.$strip>;
            };
            readonly NOT_FOUND: {
                readonly status: 404;
                readonly data: z.ZodObject<{
                    resource: z.ZodOptional<z.ZodString>;
                    resourceId: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly FORBIDDEN: {
                readonly status: 403;
                readonly data: z.ZodObject<{
                    requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    action: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly TIMEOUT: {
                readonly status: 504;
                readonly data: z.ZodObject<{
                    timeoutMs: z.ZodOptional<z.ZodNumber>;
                    operation: z.ZodOptional<z.ZodString>;
                    retryable: z.ZodDefault<z.ZodBoolean>;
                }, z.core.$strip>;
            };
            readonly CONNECTION_ERROR: {
                readonly status: 502;
                readonly data: z.ZodObject<{
                    errorCode: z.ZodOptional<z.ZodString>;
                    host: z.ZodOptional<z.ZodString>;
                    port: z.ZodOptional<z.ZodNumber>;
                    suggestion: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
        }>>>, Record<never, never>>;
        loginToPlatform: import("@orpc/contract").ContractProcedure<z.ZodObject<{
            platform: z.ZodEnum<typeof Types.Platform>;
            options: z.ZodOptional<z.ZodObject<{
                successUrl: z.ZodOptional<z.ZodString>;
                errorUrl: z.ZodOptional<z.ZodString>;
                redirect: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodObject<{
            url: z.ZodString;
        }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
            readonly UNAUTHORIZED: {
                readonly status: 401;
                readonly data: z.ZodObject<{
                    apiKeyProvided: z.ZodBoolean;
                    provider: z.ZodOptional<z.ZodString>;
                    authType: z.ZodOptional<z.ZodEnum<{
                        apiKey: "apiKey";
                        oauth: "oauth";
                        token: "token";
                    }>>;
                }, z.core.$strip>;
            };
            readonly RATE_LIMITED: {
                readonly status: 429;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodNumber;
                    remainingRequests: z.ZodOptional<z.ZodNumber>;
                    resetTime: z.ZodOptional<z.ZodString>;
                    limitType: z.ZodOptional<z.ZodEnum<{
                        requests: "requests";
                        tokens: "tokens";
                        bandwidth: "bandwidth";
                    }>>;
                }, z.core.$strip>;
            };
            readonly SERVICE_UNAVAILABLE: {
                readonly status: 503;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodOptional<z.ZodNumber>;
                    maintenanceWindow: z.ZodDefault<z.ZodBoolean>;
                    estimatedUptime: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly BAD_REQUEST: {
                readonly status: 400;
                readonly data: z.ZodObject<{
                    invalidFields: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    validationErrors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        message: z.ZodString;
                        code: z.ZodOptional<z.ZodString>;
                    }, z.core.$strip>>>;
                }, z.core.$strip>;
            };
            readonly NOT_FOUND: {
                readonly status: 404;
                readonly data: z.ZodObject<{
                    resource: z.ZodOptional<z.ZodString>;
                    resourceId: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly FORBIDDEN: {
                readonly status: 403;
                readonly data: z.ZodObject<{
                    requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    action: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly TIMEOUT: {
                readonly status: 504;
                readonly data: z.ZodObject<{
                    timeoutMs: z.ZodOptional<z.ZodNumber>;
                    operation: z.ZodOptional<z.ZodString>;
                    retryable: z.ZodDefault<z.ZodBoolean>;
                }, z.core.$strip>;
            };
            readonly CONNECTION_ERROR: {
                readonly status: 502;
                readonly data: z.ZodObject<{
                    errorCode: z.ZodOptional<z.ZodString>;
                    host: z.ZodOptional<z.ZodString>;
                    port: z.ZodOptional<z.ZodNumber>;
                    suggestion: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
        }>>>, Record<never, never>>;
        refreshToken: import("@orpc/contract").ContractProcedure<z.ZodObject<{
            platform: z.ZodEnum<typeof Types.Platform>;
            userId: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            platform: z.ZodEnum<typeof Types.Platform>;
            userId: z.ZodString;
            redirectUrl: z.ZodOptional<z.ZodString>;
            status: z.ZodObject<{
                message: z.ZodString;
                code: z.ZodString;
                details: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
            readonly UNAUTHORIZED: {
                readonly status: 401;
                readonly data: z.ZodObject<{
                    apiKeyProvided: z.ZodBoolean;
                    provider: z.ZodOptional<z.ZodString>;
                    authType: z.ZodOptional<z.ZodEnum<{
                        apiKey: "apiKey";
                        oauth: "oauth";
                        token: "token";
                    }>>;
                }, z.core.$strip>;
            };
            readonly RATE_LIMITED: {
                readonly status: 429;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodNumber;
                    remainingRequests: z.ZodOptional<z.ZodNumber>;
                    resetTime: z.ZodOptional<z.ZodString>;
                    limitType: z.ZodOptional<z.ZodEnum<{
                        requests: "requests";
                        tokens: "tokens";
                        bandwidth: "bandwidth";
                    }>>;
                }, z.core.$strip>;
            };
            readonly SERVICE_UNAVAILABLE: {
                readonly status: 503;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodOptional<z.ZodNumber>;
                    maintenanceWindow: z.ZodDefault<z.ZodBoolean>;
                    estimatedUptime: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly BAD_REQUEST: {
                readonly status: 400;
                readonly data: z.ZodObject<{
                    invalidFields: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    validationErrors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        message: z.ZodString;
                        code: z.ZodOptional<z.ZodString>;
                    }, z.core.$strip>>>;
                }, z.core.$strip>;
            };
            readonly NOT_FOUND: {
                readonly status: 404;
                readonly data: z.ZodObject<{
                    resource: z.ZodOptional<z.ZodString>;
                    resourceId: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly FORBIDDEN: {
                readonly status: 403;
                readonly data: z.ZodObject<{
                    requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    action: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly TIMEOUT: {
                readonly status: 504;
                readonly data: z.ZodObject<{
                    timeoutMs: z.ZodOptional<z.ZodNumber>;
                    operation: z.ZodOptional<z.ZodString>;
                    retryable: z.ZodDefault<z.ZodBoolean>;
                }, z.core.$strip>;
            };
            readonly CONNECTION_ERROR: {
                readonly status: 502;
                readonly data: z.ZodObject<{
                    errorCode: z.ZodOptional<z.ZodString>;
                    host: z.ZodOptional<z.ZodString>;
                    port: z.ZodOptional<z.ZodNumber>;
                    suggestion: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
        }>>>, Record<never, never>>;
        refreshProfile: import("@orpc/contract").ContractProcedure<z.ZodObject<{
            platform: z.ZodEnum<typeof Types.Platform>;
            userId: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            platform: z.ZodEnum<typeof Types.Platform>;
            userId: z.ZodString;
            connectedAt: z.ZodString;
            profile: z.ZodNullable<z.ZodObject<{
                userId: z.ZodString;
                username: z.ZodString;
                url: z.ZodOptional<z.ZodString>;
                profileImageUrl: z.ZodString;
                isPremium: z.ZodOptional<z.ZodBoolean>;
                platform: z.ZodEnum<typeof Types.Platform>;
                lastUpdated: z.ZodNumber;
            }, z.core.$strip>>;
            error: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
            readonly UNAUTHORIZED: {
                readonly status: 401;
                readonly data: z.ZodObject<{
                    apiKeyProvided: z.ZodBoolean;
                    provider: z.ZodOptional<z.ZodString>;
                    authType: z.ZodOptional<z.ZodEnum<{
                        apiKey: "apiKey";
                        oauth: "oauth";
                        token: "token";
                    }>>;
                }, z.core.$strip>;
            };
            readonly RATE_LIMITED: {
                readonly status: 429;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodNumber;
                    remainingRequests: z.ZodOptional<z.ZodNumber>;
                    resetTime: z.ZodOptional<z.ZodString>;
                    limitType: z.ZodOptional<z.ZodEnum<{
                        requests: "requests";
                        tokens: "tokens";
                        bandwidth: "bandwidth";
                    }>>;
                }, z.core.$strip>;
            };
            readonly SERVICE_UNAVAILABLE: {
                readonly status: 503;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodOptional<z.ZodNumber>;
                    maintenanceWindow: z.ZodDefault<z.ZodBoolean>;
                    estimatedUptime: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly BAD_REQUEST: {
                readonly status: 400;
                readonly data: z.ZodObject<{
                    invalidFields: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    validationErrors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        message: z.ZodString;
                        code: z.ZodOptional<z.ZodString>;
                    }, z.core.$strip>>>;
                }, z.core.$strip>;
            };
            readonly NOT_FOUND: {
                readonly status: 404;
                readonly data: z.ZodObject<{
                    resource: z.ZodOptional<z.ZodString>;
                    resourceId: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly FORBIDDEN: {
                readonly status: 403;
                readonly data: z.ZodObject<{
                    requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    action: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly TIMEOUT: {
                readonly status: 504;
                readonly data: z.ZodObject<{
                    timeoutMs: z.ZodOptional<z.ZodNumber>;
                    operation: z.ZodOptional<z.ZodString>;
                    retryable: z.ZodDefault<z.ZodBoolean>;
                }, z.core.$strip>;
            };
            readonly CONNECTION_ERROR: {
                readonly status: 502;
                readonly data: z.ZodObject<{
                    errorCode: z.ZodOptional<z.ZodString>;
                    host: z.ZodOptional<z.ZodString>;
                    port: z.ZodOptional<z.ZodNumber>;
                    suggestion: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
        }>>>, Record<never, never>>;
        getAuthStatus: import("@orpc/contract").ContractProcedure<z.ZodObject<{
            platform: z.ZodEnum<typeof Types.Platform>;
            userId: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            platform: z.ZodEnum<typeof Types.Platform>;
            userId: z.ZodString;
            authenticated: z.ZodBoolean;
            tokenStatus: z.ZodObject<{
                valid: z.ZodBoolean;
                expired: z.ZodBoolean;
                expiresAt: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
            readonly UNAUTHORIZED: {
                readonly status: 401;
                readonly data: z.ZodObject<{
                    apiKeyProvided: z.ZodBoolean;
                    provider: z.ZodOptional<z.ZodString>;
                    authType: z.ZodOptional<z.ZodEnum<{
                        apiKey: "apiKey";
                        oauth: "oauth";
                        token: "token";
                    }>>;
                }, z.core.$strip>;
            };
            readonly RATE_LIMITED: {
                readonly status: 429;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodNumber;
                    remainingRequests: z.ZodOptional<z.ZodNumber>;
                    resetTime: z.ZodOptional<z.ZodString>;
                    limitType: z.ZodOptional<z.ZodEnum<{
                        requests: "requests";
                        tokens: "tokens";
                        bandwidth: "bandwidth";
                    }>>;
                }, z.core.$strip>;
            };
            readonly SERVICE_UNAVAILABLE: {
                readonly status: 503;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodOptional<z.ZodNumber>;
                    maintenanceWindow: z.ZodDefault<z.ZodBoolean>;
                    estimatedUptime: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly BAD_REQUEST: {
                readonly status: 400;
                readonly data: z.ZodObject<{
                    invalidFields: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    validationErrors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        message: z.ZodString;
                        code: z.ZodOptional<z.ZodString>;
                    }, z.core.$strip>>>;
                }, z.core.$strip>;
            };
            readonly NOT_FOUND: {
                readonly status: 404;
                readonly data: z.ZodObject<{
                    resource: z.ZodOptional<z.ZodString>;
                    resourceId: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly FORBIDDEN: {
                readonly status: 403;
                readonly data: z.ZodObject<{
                    requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    action: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly TIMEOUT: {
                readonly status: 504;
                readonly data: z.ZodObject<{
                    timeoutMs: z.ZodOptional<z.ZodNumber>;
                    operation: z.ZodOptional<z.ZodString>;
                    retryable: z.ZodDefault<z.ZodBoolean>;
                }, z.core.$strip>;
            };
            readonly CONNECTION_ERROR: {
                readonly status: 502;
                readonly data: z.ZodObject<{
                    errorCode: z.ZodOptional<z.ZodString>;
                    host: z.ZodOptional<z.ZodString>;
                    port: z.ZodOptional<z.ZodNumber>;
                    suggestion: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
        }>>>, Record<never, never>>;
        unauthorizeNear: import("@orpc/contract").ContractProcedure<z.ZodObject<{}, z.core.$strip>, z.ZodObject<{
            success: z.ZodBoolean;
            nearAccount: z.ZodString;
        }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
            readonly UNAUTHORIZED: {
                readonly status: 401;
                readonly data: z.ZodObject<{
                    apiKeyProvided: z.ZodBoolean;
                    provider: z.ZodOptional<z.ZodString>;
                    authType: z.ZodOptional<z.ZodEnum<{
                        apiKey: "apiKey";
                        oauth: "oauth";
                        token: "token";
                    }>>;
                }, z.core.$strip>;
            };
            readonly RATE_LIMITED: {
                readonly status: 429;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodNumber;
                    remainingRequests: z.ZodOptional<z.ZodNumber>;
                    resetTime: z.ZodOptional<z.ZodString>;
                    limitType: z.ZodOptional<z.ZodEnum<{
                        requests: "requests";
                        tokens: "tokens";
                        bandwidth: "bandwidth";
                    }>>;
                }, z.core.$strip>;
            };
            readonly SERVICE_UNAVAILABLE: {
                readonly status: 503;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodOptional<z.ZodNumber>;
                    maintenanceWindow: z.ZodDefault<z.ZodBoolean>;
                    estimatedUptime: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly BAD_REQUEST: {
                readonly status: 400;
                readonly data: z.ZodObject<{
                    invalidFields: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    validationErrors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        message: z.ZodString;
                        code: z.ZodOptional<z.ZodString>;
                    }, z.core.$strip>>>;
                }, z.core.$strip>;
            };
            readonly NOT_FOUND: {
                readonly status: 404;
                readonly data: z.ZodObject<{
                    resource: z.ZodOptional<z.ZodString>;
                    resourceId: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly FORBIDDEN: {
                readonly status: 403;
                readonly data: z.ZodObject<{
                    requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    action: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly TIMEOUT: {
                readonly status: 504;
                readonly data: z.ZodObject<{
                    timeoutMs: z.ZodOptional<z.ZodNumber>;
                    operation: z.ZodOptional<z.ZodString>;
                    retryable: z.ZodDefault<z.ZodBoolean>;
                }, z.core.$strip>;
            };
            readonly CONNECTION_ERROR: {
                readonly status: 502;
                readonly data: z.ZodObject<{
                    errorCode: z.ZodOptional<z.ZodString>;
                    host: z.ZodOptional<z.ZodString>;
                    port: z.ZodOptional<z.ZodNumber>;
                    suggestion: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
        }>>>, Record<never, never>>;
        revokeAuth: import("@orpc/contract").ContractProcedure<z.ZodObject<{
            platform: z.ZodEnum<typeof Types.Platform>;
            userId: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            platform: z.ZodEnum<typeof Types.Platform>;
            userId: z.ZodString;
        }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
            readonly UNAUTHORIZED: {
                readonly status: 401;
                readonly data: z.ZodObject<{
                    apiKeyProvided: z.ZodBoolean;
                    provider: z.ZodOptional<z.ZodString>;
                    authType: z.ZodOptional<z.ZodEnum<{
                        apiKey: "apiKey";
                        oauth: "oauth";
                        token: "token";
                    }>>;
                }, z.core.$strip>;
            };
            readonly RATE_LIMITED: {
                readonly status: 429;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodNumber;
                    remainingRequests: z.ZodOptional<z.ZodNumber>;
                    resetTime: z.ZodOptional<z.ZodString>;
                    limitType: z.ZodOptional<z.ZodEnum<{
                        requests: "requests";
                        tokens: "tokens";
                        bandwidth: "bandwidth";
                    }>>;
                }, z.core.$strip>;
            };
            readonly SERVICE_UNAVAILABLE: {
                readonly status: 503;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodOptional<z.ZodNumber>;
                    maintenanceWindow: z.ZodDefault<z.ZodBoolean>;
                    estimatedUptime: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly BAD_REQUEST: {
                readonly status: 400;
                readonly data: z.ZodObject<{
                    invalidFields: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    validationErrors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        message: z.ZodString;
                        code: z.ZodOptional<z.ZodString>;
                    }, z.core.$strip>>>;
                }, z.core.$strip>;
            };
            readonly NOT_FOUND: {
                readonly status: 404;
                readonly data: z.ZodObject<{
                    resource: z.ZodOptional<z.ZodString>;
                    resourceId: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly FORBIDDEN: {
                readonly status: 403;
                readonly data: z.ZodObject<{
                    requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    action: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly TIMEOUT: {
                readonly status: 504;
                readonly data: z.ZodObject<{
                    timeoutMs: z.ZodOptional<z.ZodNumber>;
                    operation: z.ZodOptional<z.ZodString>;
                    retryable: z.ZodDefault<z.ZodBoolean>;
                }, z.core.$strip>;
            };
            readonly CONNECTION_ERROR: {
                readonly status: 502;
                readonly data: z.ZodObject<{
                    errorCode: z.ZodOptional<z.ZodString>;
                    host: z.ZodOptional<z.ZodString>;
                    port: z.ZodOptional<z.ZodNumber>;
                    suggestion: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
        }>>>, Record<never, never>>;
        getConnectedAccounts: import("@orpc/contract").ContractProcedure<import("@orpc/contract").Schema<unknown, unknown>, z.ZodObject<{
            accounts: z.ZodArray<z.ZodObject<{
                platform: z.ZodEnum<typeof Types.Platform>;
                userId: z.ZodString;
                connectedAt: z.ZodString;
                profile: z.ZodNullable<z.ZodObject<{
                    userId: z.ZodString;
                    username: z.ZodString;
                    url: z.ZodOptional<z.ZodString>;
                    profileImageUrl: z.ZodString;
                    isPremium: z.ZodOptional<z.ZodBoolean>;
                    platform: z.ZodEnum<typeof Types.Platform>;
                    lastUpdated: z.ZodNumber;
                }, z.core.$strip>>;
                error: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
        }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
            readonly UNAUTHORIZED: {
                readonly status: 401;
                readonly data: z.ZodObject<{
                    apiKeyProvided: z.ZodBoolean;
                    provider: z.ZodOptional<z.ZodString>;
                    authType: z.ZodOptional<z.ZodEnum<{
                        apiKey: "apiKey";
                        oauth: "oauth";
                        token: "token";
                    }>>;
                }, z.core.$strip>;
            };
            readonly RATE_LIMITED: {
                readonly status: 429;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodNumber;
                    remainingRequests: z.ZodOptional<z.ZodNumber>;
                    resetTime: z.ZodOptional<z.ZodString>;
                    limitType: z.ZodOptional<z.ZodEnum<{
                        requests: "requests";
                        tokens: "tokens";
                        bandwidth: "bandwidth";
                    }>>;
                }, z.core.$strip>;
            };
            readonly SERVICE_UNAVAILABLE: {
                readonly status: 503;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodOptional<z.ZodNumber>;
                    maintenanceWindow: z.ZodDefault<z.ZodBoolean>;
                    estimatedUptime: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly BAD_REQUEST: {
                readonly status: 400;
                readonly data: z.ZodObject<{
                    invalidFields: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    validationErrors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        message: z.ZodString;
                        code: z.ZodOptional<z.ZodString>;
                    }, z.core.$strip>>>;
                }, z.core.$strip>;
            };
            readonly NOT_FOUND: {
                readonly status: 404;
                readonly data: z.ZodObject<{
                    resource: z.ZodOptional<z.ZodString>;
                    resourceId: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly FORBIDDEN: {
                readonly status: 403;
                readonly data: z.ZodObject<{
                    requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    action: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly TIMEOUT: {
                readonly status: 504;
                readonly data: z.ZodObject<{
                    timeoutMs: z.ZodOptional<z.ZodNumber>;
                    operation: z.ZodOptional<z.ZodString>;
                    retryable: z.ZodDefault<z.ZodBoolean>;
                }, z.core.$strip>;
            };
            readonly CONNECTION_ERROR: {
                readonly status: 502;
                readonly data: z.ZodObject<{
                    errorCode: z.ZodOptional<z.ZodString>;
                    host: z.ZodOptional<z.ZodString>;
                    port: z.ZodOptional<z.ZodNumber>;
                    suggestion: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
        }>>>, Record<never, never>>;
    };
    post: {
        create: import("@orpc/contract").ContractProcedure<z.ZodObject<{
            targets: z.ZodArray<z.ZodObject<{
                platform: z.ZodEnum<typeof Types.Platform>;
                userId: z.ZodString;
            }, z.core.$strip>>;
            content: z.ZodArray<z.ZodObject<{
                text: z.ZodOptional<z.ZodString>;
                media: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    data: z.ZodUnion<readonly [z.ZodString, z.ZodCustom<Blob, Blob>]>;
                    mimeType: z.ZodOptional<z.ZodString>;
                    altText: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>>;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodObject<{
            data: z.ZodObject<{
                summary: z.ZodObject<{
                    total: z.ZodNumber;
                    succeeded: z.ZodNumber;
                    failed: z.ZodNumber;
                }, z.core.$strip>;
                results: z.ZodArray<z.ZodObject<{
                    platform: z.ZodString;
                    userId: z.ZodString;
                    details: z.ZodAny;
                    status: z.ZodLiteral<"success">;
                }, z.core.$strip>>;
                errors: z.ZodArray<z.ZodObject<{
                    message: z.ZodString;
                    code: z.ZodString;
                    recoverable: z.ZodBoolean;
                    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
                }, z.core.$strip>>;
            }, z.core.$strip>;
        }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
            readonly UNAUTHORIZED: {
                readonly status: 401;
                readonly data: z.ZodObject<{
                    apiKeyProvided: z.ZodBoolean;
                    provider: z.ZodOptional<z.ZodString>;
                    authType: z.ZodOptional<z.ZodEnum<{
                        apiKey: "apiKey";
                        oauth: "oauth";
                        token: "token";
                    }>>;
                }, z.core.$strip>;
            };
            readonly RATE_LIMITED: {
                readonly status: 429;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodNumber;
                    remainingRequests: z.ZodOptional<z.ZodNumber>;
                    resetTime: z.ZodOptional<z.ZodString>;
                    limitType: z.ZodOptional<z.ZodEnum<{
                        requests: "requests";
                        tokens: "tokens";
                        bandwidth: "bandwidth";
                    }>>;
                }, z.core.$strip>;
            };
            readonly SERVICE_UNAVAILABLE: {
                readonly status: 503;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodOptional<z.ZodNumber>;
                    maintenanceWindow: z.ZodDefault<z.ZodBoolean>;
                    estimatedUptime: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly BAD_REQUEST: {
                readonly status: 400;
                readonly data: z.ZodObject<{
                    invalidFields: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    validationErrors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        message: z.ZodString;
                        code: z.ZodOptional<z.ZodString>;
                    }, z.core.$strip>>>;
                }, z.core.$strip>;
            };
            readonly NOT_FOUND: {
                readonly status: 404;
                readonly data: z.ZodObject<{
                    resource: z.ZodOptional<z.ZodString>;
                    resourceId: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly FORBIDDEN: {
                readonly status: 403;
                readonly data: z.ZodObject<{
                    requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    action: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly TIMEOUT: {
                readonly status: 504;
                readonly data: z.ZodObject<{
                    timeoutMs: z.ZodOptional<z.ZodNumber>;
                    operation: z.ZodOptional<z.ZodString>;
                    retryable: z.ZodDefault<z.ZodBoolean>;
                }, z.core.$strip>;
            };
            readonly CONNECTION_ERROR: {
                readonly status: 502;
                readonly data: z.ZodObject<{
                    errorCode: z.ZodOptional<z.ZodString>;
                    host: z.ZodOptional<z.ZodString>;
                    port: z.ZodOptional<z.ZodNumber>;
                    suggestion: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
        }>>>, Record<never, never>>;
        delete: import("@orpc/contract").ContractProcedure<z.ZodObject<{
            targets: z.ZodArray<z.ZodObject<{
                platform: z.ZodEnum<typeof Types.Platform>;
                userId: z.ZodString;
            }, z.core.$strip>>;
            posts: z.ZodArray<z.ZodObject<{
                platform: z.ZodEnum<typeof Types.Platform>;
                userId: z.ZodString;
                postId: z.ZodString;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodObject<{
            data: z.ZodObject<{
                summary: z.ZodObject<{
                    total: z.ZodNumber;
                    succeeded: z.ZodNumber;
                    failed: z.ZodNumber;
                }, z.core.$strip>;
                results: z.ZodArray<z.ZodObject<{
                    platform: z.ZodString;
                    userId: z.ZodString;
                    details: z.ZodAny;
                    status: z.ZodLiteral<"success">;
                }, z.core.$strip>>;
                errors: z.ZodArray<z.ZodObject<{
                    message: z.ZodString;
                    code: z.ZodString;
                    recoverable: z.ZodBoolean;
                    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
                }, z.core.$strip>>;
            }, z.core.$strip>;
        }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
            readonly UNAUTHORIZED: {
                readonly status: 401;
                readonly data: z.ZodObject<{
                    apiKeyProvided: z.ZodBoolean;
                    provider: z.ZodOptional<z.ZodString>;
                    authType: z.ZodOptional<z.ZodEnum<{
                        apiKey: "apiKey";
                        oauth: "oauth";
                        token: "token";
                    }>>;
                }, z.core.$strip>;
            };
            readonly RATE_LIMITED: {
                readonly status: 429;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodNumber;
                    remainingRequests: z.ZodOptional<z.ZodNumber>;
                    resetTime: z.ZodOptional<z.ZodString>;
                    limitType: z.ZodOptional<z.ZodEnum<{
                        requests: "requests";
                        tokens: "tokens";
                        bandwidth: "bandwidth";
                    }>>;
                }, z.core.$strip>;
            };
            readonly SERVICE_UNAVAILABLE: {
                readonly status: 503;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodOptional<z.ZodNumber>;
                    maintenanceWindow: z.ZodDefault<z.ZodBoolean>;
                    estimatedUptime: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly BAD_REQUEST: {
                readonly status: 400;
                readonly data: z.ZodObject<{
                    invalidFields: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    validationErrors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        message: z.ZodString;
                        code: z.ZodOptional<z.ZodString>;
                    }, z.core.$strip>>>;
                }, z.core.$strip>;
            };
            readonly NOT_FOUND: {
                readonly status: 404;
                readonly data: z.ZodObject<{
                    resource: z.ZodOptional<z.ZodString>;
                    resourceId: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly FORBIDDEN: {
                readonly status: 403;
                readonly data: z.ZodObject<{
                    requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    action: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly TIMEOUT: {
                readonly status: 504;
                readonly data: z.ZodObject<{
                    timeoutMs: z.ZodOptional<z.ZodNumber>;
                    operation: z.ZodOptional<z.ZodString>;
                    retryable: z.ZodDefault<z.ZodBoolean>;
                }, z.core.$strip>;
            };
            readonly CONNECTION_ERROR: {
                readonly status: 502;
                readonly data: z.ZodObject<{
                    errorCode: z.ZodOptional<z.ZodString>;
                    host: z.ZodOptional<z.ZodString>;
                    port: z.ZodOptional<z.ZodNumber>;
                    suggestion: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
        }>>>, Record<never, never>>;
        repost: import("@orpc/contract").ContractProcedure<z.ZodObject<{
            targets: z.ZodArray<z.ZodObject<{
                platform: z.ZodEnum<typeof Types.Platform>;
                userId: z.ZodString;
            }, z.core.$strip>>;
            platform: z.ZodEnum<typeof Types.Platform>;
            postId: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            data: z.ZodObject<{
                summary: z.ZodObject<{
                    total: z.ZodNumber;
                    succeeded: z.ZodNumber;
                    failed: z.ZodNumber;
                }, z.core.$strip>;
                results: z.ZodArray<z.ZodObject<{
                    platform: z.ZodString;
                    userId: z.ZodString;
                    details: z.ZodAny;
                    status: z.ZodLiteral<"success">;
                }, z.core.$strip>>;
                errors: z.ZodArray<z.ZodObject<{
                    message: z.ZodString;
                    code: z.ZodString;
                    recoverable: z.ZodBoolean;
                    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
                }, z.core.$strip>>;
            }, z.core.$strip>;
        }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
            readonly UNAUTHORIZED: {
                readonly status: 401;
                readonly data: z.ZodObject<{
                    apiKeyProvided: z.ZodBoolean;
                    provider: z.ZodOptional<z.ZodString>;
                    authType: z.ZodOptional<z.ZodEnum<{
                        apiKey: "apiKey";
                        oauth: "oauth";
                        token: "token";
                    }>>;
                }, z.core.$strip>;
            };
            readonly RATE_LIMITED: {
                readonly status: 429;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodNumber;
                    remainingRequests: z.ZodOptional<z.ZodNumber>;
                    resetTime: z.ZodOptional<z.ZodString>;
                    limitType: z.ZodOptional<z.ZodEnum<{
                        requests: "requests";
                        tokens: "tokens";
                        bandwidth: "bandwidth";
                    }>>;
                }, z.core.$strip>;
            };
            readonly SERVICE_UNAVAILABLE: {
                readonly status: 503;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodOptional<z.ZodNumber>;
                    maintenanceWindow: z.ZodDefault<z.ZodBoolean>;
                    estimatedUptime: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly BAD_REQUEST: {
                readonly status: 400;
                readonly data: z.ZodObject<{
                    invalidFields: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    validationErrors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        message: z.ZodString;
                        code: z.ZodOptional<z.ZodString>;
                    }, z.core.$strip>>>;
                }, z.core.$strip>;
            };
            readonly NOT_FOUND: {
                readonly status: 404;
                readonly data: z.ZodObject<{
                    resource: z.ZodOptional<z.ZodString>;
                    resourceId: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly FORBIDDEN: {
                readonly status: 403;
                readonly data: z.ZodObject<{
                    requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    action: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly TIMEOUT: {
                readonly status: 504;
                readonly data: z.ZodObject<{
                    timeoutMs: z.ZodOptional<z.ZodNumber>;
                    operation: z.ZodOptional<z.ZodString>;
                    retryable: z.ZodDefault<z.ZodBoolean>;
                }, z.core.$strip>;
            };
            readonly CONNECTION_ERROR: {
                readonly status: 502;
                readonly data: z.ZodObject<{
                    errorCode: z.ZodOptional<z.ZodString>;
                    host: z.ZodOptional<z.ZodString>;
                    port: z.ZodOptional<z.ZodNumber>;
                    suggestion: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
        }>>>, Record<never, never>>;
        quote: import("@orpc/contract").ContractProcedure<z.ZodObject<{
            targets: z.ZodArray<z.ZodObject<{
                platform: z.ZodEnum<typeof Types.Platform>;
                userId: z.ZodString;
            }, z.core.$strip>>;
            platform: z.ZodEnum<typeof Types.Platform>;
            postId: z.ZodString;
            content: z.ZodArray<z.ZodObject<{
                text: z.ZodOptional<z.ZodString>;
                media: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    data: z.ZodUnion<readonly [z.ZodString, z.ZodCustom<Blob, Blob>]>;
                    mimeType: z.ZodOptional<z.ZodString>;
                    altText: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>>;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodObject<{
            data: z.ZodObject<{
                summary: z.ZodObject<{
                    total: z.ZodNumber;
                    succeeded: z.ZodNumber;
                    failed: z.ZodNumber;
                }, z.core.$strip>;
                results: z.ZodArray<z.ZodObject<{
                    platform: z.ZodString;
                    userId: z.ZodString;
                    details: z.ZodAny;
                    status: z.ZodLiteral<"success">;
                }, z.core.$strip>>;
                errors: z.ZodArray<z.ZodObject<{
                    message: z.ZodString;
                    code: z.ZodString;
                    recoverable: z.ZodBoolean;
                    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
                }, z.core.$strip>>;
            }, z.core.$strip>;
        }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
            readonly UNAUTHORIZED: {
                readonly status: 401;
                readonly data: z.ZodObject<{
                    apiKeyProvided: z.ZodBoolean;
                    provider: z.ZodOptional<z.ZodString>;
                    authType: z.ZodOptional<z.ZodEnum<{
                        apiKey: "apiKey";
                        oauth: "oauth";
                        token: "token";
                    }>>;
                }, z.core.$strip>;
            };
            readonly RATE_LIMITED: {
                readonly status: 429;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodNumber;
                    remainingRequests: z.ZodOptional<z.ZodNumber>;
                    resetTime: z.ZodOptional<z.ZodString>;
                    limitType: z.ZodOptional<z.ZodEnum<{
                        requests: "requests";
                        tokens: "tokens";
                        bandwidth: "bandwidth";
                    }>>;
                }, z.core.$strip>;
            };
            readonly SERVICE_UNAVAILABLE: {
                readonly status: 503;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodOptional<z.ZodNumber>;
                    maintenanceWindow: z.ZodDefault<z.ZodBoolean>;
                    estimatedUptime: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly BAD_REQUEST: {
                readonly status: 400;
                readonly data: z.ZodObject<{
                    invalidFields: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    validationErrors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        message: z.ZodString;
                        code: z.ZodOptional<z.ZodString>;
                    }, z.core.$strip>>>;
                }, z.core.$strip>;
            };
            readonly NOT_FOUND: {
                readonly status: 404;
                readonly data: z.ZodObject<{
                    resource: z.ZodOptional<z.ZodString>;
                    resourceId: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly FORBIDDEN: {
                readonly status: 403;
                readonly data: z.ZodObject<{
                    requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    action: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly TIMEOUT: {
                readonly status: 504;
                readonly data: z.ZodObject<{
                    timeoutMs: z.ZodOptional<z.ZodNumber>;
                    operation: z.ZodOptional<z.ZodString>;
                    retryable: z.ZodDefault<z.ZodBoolean>;
                }, z.core.$strip>;
            };
            readonly CONNECTION_ERROR: {
                readonly status: 502;
                readonly data: z.ZodObject<{
                    errorCode: z.ZodOptional<z.ZodString>;
                    host: z.ZodOptional<z.ZodString>;
                    port: z.ZodOptional<z.ZodNumber>;
                    suggestion: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
        }>>>, Record<never, never>>;
        reply: import("@orpc/contract").ContractProcedure<z.ZodObject<{
            targets: z.ZodArray<z.ZodObject<{
                platform: z.ZodEnum<typeof Types.Platform>;
                userId: z.ZodString;
            }, z.core.$strip>>;
            platform: z.ZodEnum<typeof Types.Platform>;
            postId: z.ZodString;
            content: z.ZodArray<z.ZodObject<{
                text: z.ZodOptional<z.ZodString>;
                media: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    data: z.ZodUnion<readonly [z.ZodString, z.ZodCustom<Blob, Blob>]>;
                    mimeType: z.ZodOptional<z.ZodString>;
                    altText: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>>;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodObject<{
            data: z.ZodObject<{
                summary: z.ZodObject<{
                    total: z.ZodNumber;
                    succeeded: z.ZodNumber;
                    failed: z.ZodNumber;
                }, z.core.$strip>;
                results: z.ZodArray<z.ZodObject<{
                    platform: z.ZodString;
                    userId: z.ZodString;
                    details: z.ZodAny;
                    status: z.ZodLiteral<"success">;
                }, z.core.$strip>>;
                errors: z.ZodArray<z.ZodObject<{
                    message: z.ZodString;
                    code: z.ZodString;
                    recoverable: z.ZodBoolean;
                    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
                }, z.core.$strip>>;
            }, z.core.$strip>;
        }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
            readonly UNAUTHORIZED: {
                readonly status: 401;
                readonly data: z.ZodObject<{
                    apiKeyProvided: z.ZodBoolean;
                    provider: z.ZodOptional<z.ZodString>;
                    authType: z.ZodOptional<z.ZodEnum<{
                        apiKey: "apiKey";
                        oauth: "oauth";
                        token: "token";
                    }>>;
                }, z.core.$strip>;
            };
            readonly RATE_LIMITED: {
                readonly status: 429;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodNumber;
                    remainingRequests: z.ZodOptional<z.ZodNumber>;
                    resetTime: z.ZodOptional<z.ZodString>;
                    limitType: z.ZodOptional<z.ZodEnum<{
                        requests: "requests";
                        tokens: "tokens";
                        bandwidth: "bandwidth";
                    }>>;
                }, z.core.$strip>;
            };
            readonly SERVICE_UNAVAILABLE: {
                readonly status: 503;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodOptional<z.ZodNumber>;
                    maintenanceWindow: z.ZodDefault<z.ZodBoolean>;
                    estimatedUptime: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly BAD_REQUEST: {
                readonly status: 400;
                readonly data: z.ZodObject<{
                    invalidFields: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    validationErrors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        message: z.ZodString;
                        code: z.ZodOptional<z.ZodString>;
                    }, z.core.$strip>>>;
                }, z.core.$strip>;
            };
            readonly NOT_FOUND: {
                readonly status: 404;
                readonly data: z.ZodObject<{
                    resource: z.ZodOptional<z.ZodString>;
                    resourceId: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly FORBIDDEN: {
                readonly status: 403;
                readonly data: z.ZodObject<{
                    requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    action: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly TIMEOUT: {
                readonly status: 504;
                readonly data: z.ZodObject<{
                    timeoutMs: z.ZodOptional<z.ZodNumber>;
                    operation: z.ZodOptional<z.ZodString>;
                    retryable: z.ZodDefault<z.ZodBoolean>;
                }, z.core.$strip>;
            };
            readonly CONNECTION_ERROR: {
                readonly status: 502;
                readonly data: z.ZodObject<{
                    errorCode: z.ZodOptional<z.ZodString>;
                    host: z.ZodOptional<z.ZodString>;
                    port: z.ZodOptional<z.ZodNumber>;
                    suggestion: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
        }>>>, Record<never, never>>;
        like: import("@orpc/contract").ContractProcedure<z.ZodObject<{
            targets: z.ZodArray<z.ZodObject<{
                platform: z.ZodEnum<typeof Types.Platform>;
                userId: z.ZodString;
            }, z.core.$strip>>;
            platform: z.ZodEnum<typeof Types.Platform>;
            postId: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            data: z.ZodObject<{
                summary: z.ZodObject<{
                    total: z.ZodNumber;
                    succeeded: z.ZodNumber;
                    failed: z.ZodNumber;
                }, z.core.$strip>;
                results: z.ZodArray<z.ZodObject<{
                    platform: z.ZodString;
                    userId: z.ZodString;
                    details: z.ZodAny;
                    status: z.ZodLiteral<"success">;
                }, z.core.$strip>>;
                errors: z.ZodArray<z.ZodObject<{
                    message: z.ZodString;
                    code: z.ZodString;
                    recoverable: z.ZodBoolean;
                    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
                }, z.core.$strip>>;
            }, z.core.$strip>;
        }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
            readonly UNAUTHORIZED: {
                readonly status: 401;
                readonly data: z.ZodObject<{
                    apiKeyProvided: z.ZodBoolean;
                    provider: z.ZodOptional<z.ZodString>;
                    authType: z.ZodOptional<z.ZodEnum<{
                        apiKey: "apiKey";
                        oauth: "oauth";
                        token: "token";
                    }>>;
                }, z.core.$strip>;
            };
            readonly RATE_LIMITED: {
                readonly status: 429;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodNumber;
                    remainingRequests: z.ZodOptional<z.ZodNumber>;
                    resetTime: z.ZodOptional<z.ZodString>;
                    limitType: z.ZodOptional<z.ZodEnum<{
                        requests: "requests";
                        tokens: "tokens";
                        bandwidth: "bandwidth";
                    }>>;
                }, z.core.$strip>;
            };
            readonly SERVICE_UNAVAILABLE: {
                readonly status: 503;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodOptional<z.ZodNumber>;
                    maintenanceWindow: z.ZodDefault<z.ZodBoolean>;
                    estimatedUptime: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly BAD_REQUEST: {
                readonly status: 400;
                readonly data: z.ZodObject<{
                    invalidFields: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    validationErrors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        message: z.ZodString;
                        code: z.ZodOptional<z.ZodString>;
                    }, z.core.$strip>>>;
                }, z.core.$strip>;
            };
            readonly NOT_FOUND: {
                readonly status: 404;
                readonly data: z.ZodObject<{
                    resource: z.ZodOptional<z.ZodString>;
                    resourceId: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly FORBIDDEN: {
                readonly status: 403;
                readonly data: z.ZodObject<{
                    requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    action: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly TIMEOUT: {
                readonly status: 504;
                readonly data: z.ZodObject<{
                    timeoutMs: z.ZodOptional<z.ZodNumber>;
                    operation: z.ZodOptional<z.ZodString>;
                    retryable: z.ZodDefault<z.ZodBoolean>;
                }, z.core.$strip>;
            };
            readonly CONNECTION_ERROR: {
                readonly status: 502;
                readonly data: z.ZodObject<{
                    errorCode: z.ZodOptional<z.ZodString>;
                    host: z.ZodOptional<z.ZodString>;
                    port: z.ZodOptional<z.ZodNumber>;
                    suggestion: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
        }>>>, Record<never, never>>;
        unlike: import("@orpc/contract").ContractProcedure<z.ZodObject<{
            targets: z.ZodArray<z.ZodObject<{
                platform: z.ZodEnum<typeof Types.Platform>;
                userId: z.ZodString;
            }, z.core.$strip>>;
            platform: z.ZodEnum<typeof Types.Platform>;
            postId: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            data: z.ZodObject<{
                summary: z.ZodObject<{
                    total: z.ZodNumber;
                    succeeded: z.ZodNumber;
                    failed: z.ZodNumber;
                }, z.core.$strip>;
                results: z.ZodArray<z.ZodObject<{
                    platform: z.ZodString;
                    userId: z.ZodString;
                    details: z.ZodAny;
                    status: z.ZodLiteral<"success">;
                }, z.core.$strip>>;
                errors: z.ZodArray<z.ZodObject<{
                    message: z.ZodString;
                    code: z.ZodString;
                    recoverable: z.ZodBoolean;
                    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
                }, z.core.$strip>>;
            }, z.core.$strip>;
        }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
            readonly UNAUTHORIZED: {
                readonly status: 401;
                readonly data: z.ZodObject<{
                    apiKeyProvided: z.ZodBoolean;
                    provider: z.ZodOptional<z.ZodString>;
                    authType: z.ZodOptional<z.ZodEnum<{
                        apiKey: "apiKey";
                        oauth: "oauth";
                        token: "token";
                    }>>;
                }, z.core.$strip>;
            };
            readonly RATE_LIMITED: {
                readonly status: 429;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodNumber;
                    remainingRequests: z.ZodOptional<z.ZodNumber>;
                    resetTime: z.ZodOptional<z.ZodString>;
                    limitType: z.ZodOptional<z.ZodEnum<{
                        requests: "requests";
                        tokens: "tokens";
                        bandwidth: "bandwidth";
                    }>>;
                }, z.core.$strip>;
            };
            readonly SERVICE_UNAVAILABLE: {
                readonly status: 503;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodOptional<z.ZodNumber>;
                    maintenanceWindow: z.ZodDefault<z.ZodBoolean>;
                    estimatedUptime: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly BAD_REQUEST: {
                readonly status: 400;
                readonly data: z.ZodObject<{
                    invalidFields: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    validationErrors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        message: z.ZodString;
                        code: z.ZodOptional<z.ZodString>;
                    }, z.core.$strip>>>;
                }, z.core.$strip>;
            };
            readonly NOT_FOUND: {
                readonly status: 404;
                readonly data: z.ZodObject<{
                    resource: z.ZodOptional<z.ZodString>;
                    resourceId: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly FORBIDDEN: {
                readonly status: 403;
                readonly data: z.ZodObject<{
                    requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    action: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly TIMEOUT: {
                readonly status: 504;
                readonly data: z.ZodObject<{
                    timeoutMs: z.ZodOptional<z.ZodNumber>;
                    operation: z.ZodOptional<z.ZodString>;
                    retryable: z.ZodDefault<z.ZodBoolean>;
                }, z.core.$strip>;
            };
            readonly CONNECTION_ERROR: {
                readonly status: 502;
                readonly data: z.ZodObject<{
                    errorCode: z.ZodOptional<z.ZodString>;
                    host: z.ZodOptional<z.ZodString>;
                    port: z.ZodOptional<z.ZodNumber>;
                    suggestion: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
        }>>>, Record<never, never>>;
    };
    activity: {
        getLeaderboard: import("@orpc/contract").ContractProcedure<z.ZodOptional<z.ZodObject<{
            limit: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
            offset: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
            platforms: z.ZodOptional<z.ZodArray<z.ZodString>>;
            types: z.ZodOptional<z.ZodArray<z.ZodString>>;
            timeframe: z.ZodOptional<z.ZodEnum<typeof Types.TimePeriod>>;
            startDate: z.ZodOptional<z.ZodString>;
            endDate: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>, z.ZodObject<{
            leaderboard: z.ZodArray<z.ZodObject<{
                signerId: z.ZodString;
                postCount: z.ZodNumber;
                firstPostTimestamp: z.ZodNumber;
                lastPostTimestamp: z.ZodNumber;
            }, z.core.$strip>>;
            total: z.ZodNumber;
        }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
            readonly UNAUTHORIZED: {
                readonly status: 401;
                readonly data: z.ZodObject<{
                    apiKeyProvided: z.ZodBoolean;
                    provider: z.ZodOptional<z.ZodString>;
                    authType: z.ZodOptional<z.ZodEnum<{
                        apiKey: "apiKey";
                        oauth: "oauth";
                        token: "token";
                    }>>;
                }, z.core.$strip>;
            };
            readonly RATE_LIMITED: {
                readonly status: 429;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodNumber;
                    remainingRequests: z.ZodOptional<z.ZodNumber>;
                    resetTime: z.ZodOptional<z.ZodString>;
                    limitType: z.ZodOptional<z.ZodEnum<{
                        requests: "requests";
                        tokens: "tokens";
                        bandwidth: "bandwidth";
                    }>>;
                }, z.core.$strip>;
            };
            readonly SERVICE_UNAVAILABLE: {
                readonly status: 503;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodOptional<z.ZodNumber>;
                    maintenanceWindow: z.ZodDefault<z.ZodBoolean>;
                    estimatedUptime: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly BAD_REQUEST: {
                readonly status: 400;
                readonly data: z.ZodObject<{
                    invalidFields: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    validationErrors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        message: z.ZodString;
                        code: z.ZodOptional<z.ZodString>;
                    }, z.core.$strip>>>;
                }, z.core.$strip>;
            };
            readonly NOT_FOUND: {
                readonly status: 404;
                readonly data: z.ZodObject<{
                    resource: z.ZodOptional<z.ZodString>;
                    resourceId: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly FORBIDDEN: {
                readonly status: 403;
                readonly data: z.ZodObject<{
                    requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    action: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly TIMEOUT: {
                readonly status: 504;
                readonly data: z.ZodObject<{
                    timeoutMs: z.ZodOptional<z.ZodNumber>;
                    operation: z.ZodOptional<z.ZodString>;
                    retryable: z.ZodDefault<z.ZodBoolean>;
                }, z.core.$strip>;
            };
            readonly CONNECTION_ERROR: {
                readonly status: 502;
                readonly data: z.ZodObject<{
                    errorCode: z.ZodOptional<z.ZodString>;
                    host: z.ZodOptional<z.ZodString>;
                    port: z.ZodOptional<z.ZodNumber>;
                    suggestion: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
        }>>>, Record<never, never>>;
        getAccountActivity: import("@orpc/contract").ContractProcedure<z.ZodObject<{
            signerId: z.ZodString;
            query: z.ZodOptional<z.ZodObject<{
                limit: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
                offset: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
                platforms: z.ZodOptional<z.ZodArray<z.ZodString>>;
                types: z.ZodOptional<z.ZodArray<z.ZodString>>;
                timeframe: z.ZodOptional<z.ZodEnum<typeof Types.TimePeriod>>;
                startDate: z.ZodOptional<z.ZodString>;
                endDate: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodObject<{
            signerId: z.ZodString;
            activity: z.ZodArray<z.ZodObject<{
                signerId: z.ZodString;
                postCount: z.ZodNumber;
                firstPostTimestamp: z.ZodNumber;
                lastPostTimestamp: z.ZodNumber;
                platform: z.ZodString;
            }, z.core.$strip>>;
            total: z.ZodNumber;
        }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
            readonly UNAUTHORIZED: {
                readonly status: 401;
                readonly data: z.ZodObject<{
                    apiKeyProvided: z.ZodBoolean;
                    provider: z.ZodOptional<z.ZodString>;
                    authType: z.ZodOptional<z.ZodEnum<{
                        apiKey: "apiKey";
                        oauth: "oauth";
                        token: "token";
                    }>>;
                }, z.core.$strip>;
            };
            readonly RATE_LIMITED: {
                readonly status: 429;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodNumber;
                    remainingRequests: z.ZodOptional<z.ZodNumber>;
                    resetTime: z.ZodOptional<z.ZodString>;
                    limitType: z.ZodOptional<z.ZodEnum<{
                        requests: "requests";
                        tokens: "tokens";
                        bandwidth: "bandwidth";
                    }>>;
                }, z.core.$strip>;
            };
            readonly SERVICE_UNAVAILABLE: {
                readonly status: 503;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodOptional<z.ZodNumber>;
                    maintenanceWindow: z.ZodDefault<z.ZodBoolean>;
                    estimatedUptime: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly BAD_REQUEST: {
                readonly status: 400;
                readonly data: z.ZodObject<{
                    invalidFields: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    validationErrors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        message: z.ZodString;
                        code: z.ZodOptional<z.ZodString>;
                    }, z.core.$strip>>>;
                }, z.core.$strip>;
            };
            readonly NOT_FOUND: {
                readonly status: 404;
                readonly data: z.ZodObject<{
                    resource: z.ZodOptional<z.ZodString>;
                    resourceId: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly FORBIDDEN: {
                readonly status: 403;
                readonly data: z.ZodObject<{
                    requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    action: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly TIMEOUT: {
                readonly status: 504;
                readonly data: z.ZodObject<{
                    timeoutMs: z.ZodOptional<z.ZodNumber>;
                    operation: z.ZodOptional<z.ZodString>;
                    retryable: z.ZodDefault<z.ZodBoolean>;
                }, z.core.$strip>;
            };
            readonly CONNECTION_ERROR: {
                readonly status: 502;
                readonly data: z.ZodObject<{
                    errorCode: z.ZodOptional<z.ZodString>;
                    host: z.ZodOptional<z.ZodString>;
                    port: z.ZodOptional<z.ZodNumber>;
                    suggestion: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
        }>>>, Record<never, never>>;
        getAccountPosts: import("@orpc/contract").ContractProcedure<z.ZodObject<{
            signerId: z.ZodString;
            query: z.ZodOptional<z.ZodObject<{
                limit: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
                offset: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
                platforms: z.ZodOptional<z.ZodArray<z.ZodString>>;
                types: z.ZodOptional<z.ZodArray<z.ZodString>>;
                timeframe: z.ZodOptional<z.ZodEnum<typeof Types.TimePeriod>>;
                startDate: z.ZodOptional<z.ZodString>;
                endDate: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodObject<{
            signerId: z.ZodString;
            posts: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                platform: z.ZodEnum<typeof Types.Platform>;
                userId: z.ZodString;
                type: z.ZodEnum<typeof Types.ActivityType>;
                content: z.ZodOptional<z.ZodString>;
                url: z.ZodOptional<z.ZodString>;
                createdAt: z.ZodString;
                metrics: z.ZodOptional<z.ZodObject<{
                    likes: z.ZodOptional<z.ZodNumber>;
                    reposts: z.ZodOptional<z.ZodNumber>;
                    replies: z.ZodOptional<z.ZodNumber>;
                    quotes: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strip>>;
                inReplyToId: z.ZodOptional<z.ZodString>;
                quotedPostId: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
            platforms: z.ZodOptional<z.ZodArray<z.ZodString>>;
            types: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
            readonly UNAUTHORIZED: {
                readonly status: 401;
                readonly data: z.ZodObject<{
                    apiKeyProvided: z.ZodBoolean;
                    provider: z.ZodOptional<z.ZodString>;
                    authType: z.ZodOptional<z.ZodEnum<{
                        apiKey: "apiKey";
                        oauth: "oauth";
                        token: "token";
                    }>>;
                }, z.core.$strip>;
            };
            readonly RATE_LIMITED: {
                readonly status: 429;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodNumber;
                    remainingRequests: z.ZodOptional<z.ZodNumber>;
                    resetTime: z.ZodOptional<z.ZodString>;
                    limitType: z.ZodOptional<z.ZodEnum<{
                        requests: "requests";
                        tokens: "tokens";
                        bandwidth: "bandwidth";
                    }>>;
                }, z.core.$strip>;
            };
            readonly SERVICE_UNAVAILABLE: {
                readonly status: 503;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodOptional<z.ZodNumber>;
                    maintenanceWindow: z.ZodDefault<z.ZodBoolean>;
                    estimatedUptime: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly BAD_REQUEST: {
                readonly status: 400;
                readonly data: z.ZodObject<{
                    invalidFields: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    validationErrors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        message: z.ZodString;
                        code: z.ZodOptional<z.ZodString>;
                    }, z.core.$strip>>>;
                }, z.core.$strip>;
            };
            readonly NOT_FOUND: {
                readonly status: 404;
                readonly data: z.ZodObject<{
                    resource: z.ZodOptional<z.ZodString>;
                    resourceId: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly FORBIDDEN: {
                readonly status: 403;
                readonly data: z.ZodObject<{
                    requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    action: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly TIMEOUT: {
                readonly status: 504;
                readonly data: z.ZodObject<{
                    timeoutMs: z.ZodOptional<z.ZodNumber>;
                    operation: z.ZodOptional<z.ZodString>;
                    retryable: z.ZodDefault<z.ZodBoolean>;
                }, z.core.$strip>;
            };
            readonly CONNECTION_ERROR: {
                readonly status: 502;
                readonly data: z.ZodObject<{
                    errorCode: z.ZodOptional<z.ZodString>;
                    host: z.ZodOptional<z.ZodString>;
                    port: z.ZodOptional<z.ZodNumber>;
                    suggestion: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
        }>>>, Record<never, never>>;
    };
    system: {
        getRateLimits: import("@orpc/contract").ContractProcedure<import("@orpc/contract").Schema<unknown, unknown>, z.ZodObject<{
            limits: z.ZodArray<z.ZodObject<{
                platform: z.ZodEnum<typeof Types.Platform>;
                limits: z.ZodRecord<z.ZodString, z.ZodObject<{
                    limit: z.ZodNumber;
                    remaining: z.ZodNumber;
                    reset: z.ZodNumber;
                    resetAfter: z.ZodNumber;
                }, z.core.$strip>>;
            }, z.core.$strip>>;
        }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
            readonly UNAUTHORIZED: {
                readonly status: 401;
                readonly data: z.ZodObject<{
                    apiKeyProvided: z.ZodBoolean;
                    provider: z.ZodOptional<z.ZodString>;
                    authType: z.ZodOptional<z.ZodEnum<{
                        apiKey: "apiKey";
                        oauth: "oauth";
                        token: "token";
                    }>>;
                }, z.core.$strip>;
            };
            readonly RATE_LIMITED: {
                readonly status: 429;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodNumber;
                    remainingRequests: z.ZodOptional<z.ZodNumber>;
                    resetTime: z.ZodOptional<z.ZodString>;
                    limitType: z.ZodOptional<z.ZodEnum<{
                        requests: "requests";
                        tokens: "tokens";
                        bandwidth: "bandwidth";
                    }>>;
                }, z.core.$strip>;
            };
            readonly SERVICE_UNAVAILABLE: {
                readonly status: 503;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodOptional<z.ZodNumber>;
                    maintenanceWindow: z.ZodDefault<z.ZodBoolean>;
                    estimatedUptime: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly BAD_REQUEST: {
                readonly status: 400;
                readonly data: z.ZodObject<{
                    invalidFields: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    validationErrors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        message: z.ZodString;
                        code: z.ZodOptional<z.ZodString>;
                    }, z.core.$strip>>>;
                }, z.core.$strip>;
            };
            readonly NOT_FOUND: {
                readonly status: 404;
                readonly data: z.ZodObject<{
                    resource: z.ZodOptional<z.ZodString>;
                    resourceId: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly FORBIDDEN: {
                readonly status: 403;
                readonly data: z.ZodObject<{
                    requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    action: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly TIMEOUT: {
                readonly status: 504;
                readonly data: z.ZodObject<{
                    timeoutMs: z.ZodOptional<z.ZodNumber>;
                    operation: z.ZodOptional<z.ZodString>;
                    retryable: z.ZodDefault<z.ZodBoolean>;
                }, z.core.$strip>;
            };
            readonly CONNECTION_ERROR: {
                readonly status: 502;
                readonly data: z.ZodObject<{
                    errorCode: z.ZodOptional<z.ZodString>;
                    host: z.ZodOptional<z.ZodString>;
                    port: z.ZodOptional<z.ZodNumber>;
                    suggestion: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
        }>>>, Record<never, never>>;
        getEndpointRateLimit: import("@orpc/contract").ContractProcedure<z.ZodObject<{
            endpoint: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            endpoint: z.ZodString;
            limit: z.ZodNumber;
            remaining: z.ZodNumber;
            reset: z.ZodNumber;
            platform: z.ZodOptional<z.ZodEnum<typeof Types.Platform>>;
        }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
            readonly UNAUTHORIZED: {
                readonly status: 401;
                readonly data: z.ZodObject<{
                    apiKeyProvided: z.ZodBoolean;
                    provider: z.ZodOptional<z.ZodString>;
                    authType: z.ZodOptional<z.ZodEnum<{
                        apiKey: "apiKey";
                        oauth: "oauth";
                        token: "token";
                    }>>;
                }, z.core.$strip>;
            };
            readonly RATE_LIMITED: {
                readonly status: 429;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodNumber;
                    remainingRequests: z.ZodOptional<z.ZodNumber>;
                    resetTime: z.ZodOptional<z.ZodString>;
                    limitType: z.ZodOptional<z.ZodEnum<{
                        requests: "requests";
                        tokens: "tokens";
                        bandwidth: "bandwidth";
                    }>>;
                }, z.core.$strip>;
            };
            readonly SERVICE_UNAVAILABLE: {
                readonly status: 503;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodOptional<z.ZodNumber>;
                    maintenanceWindow: z.ZodDefault<z.ZodBoolean>;
                    estimatedUptime: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly BAD_REQUEST: {
                readonly status: 400;
                readonly data: z.ZodObject<{
                    invalidFields: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    validationErrors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        message: z.ZodString;
                        code: z.ZodOptional<z.ZodString>;
                    }, z.core.$strip>>>;
                }, z.core.$strip>;
            };
            readonly NOT_FOUND: {
                readonly status: 404;
                readonly data: z.ZodObject<{
                    resource: z.ZodOptional<z.ZodString>;
                    resourceId: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly FORBIDDEN: {
                readonly status: 403;
                readonly data: z.ZodObject<{
                    requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    action: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly TIMEOUT: {
                readonly status: 504;
                readonly data: z.ZodObject<{
                    timeoutMs: z.ZodOptional<z.ZodNumber>;
                    operation: z.ZodOptional<z.ZodString>;
                    retryable: z.ZodDefault<z.ZodBoolean>;
                }, z.core.$strip>;
            };
            readonly CONNECTION_ERROR: {
                readonly status: 502;
                readonly data: z.ZodObject<{
                    errorCode: z.ZodOptional<z.ZodString>;
                    host: z.ZodOptional<z.ZodString>;
                    port: z.ZodOptional<z.ZodNumber>;
                    suggestion: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
        }>>>, Record<never, never>>;
        getHealthStatus: import("@orpc/contract").ContractProcedure<import("@orpc/contract").Schema<unknown, unknown>, z.ZodObject<{
            status: z.ZodString;
            version: z.ZodOptional<z.ZodString>;
            timestamp: z.ZodString;
        }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
            readonly UNAUTHORIZED: {
                readonly status: 401;
                readonly data: z.ZodObject<{
                    apiKeyProvided: z.ZodBoolean;
                    provider: z.ZodOptional<z.ZodString>;
                    authType: z.ZodOptional<z.ZodEnum<{
                        apiKey: "apiKey";
                        oauth: "oauth";
                        token: "token";
                    }>>;
                }, z.core.$strip>;
            };
            readonly RATE_LIMITED: {
                readonly status: 429;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodNumber;
                    remainingRequests: z.ZodOptional<z.ZodNumber>;
                    resetTime: z.ZodOptional<z.ZodString>;
                    limitType: z.ZodOptional<z.ZodEnum<{
                        requests: "requests";
                        tokens: "tokens";
                        bandwidth: "bandwidth";
                    }>>;
                }, z.core.$strip>;
            };
            readonly SERVICE_UNAVAILABLE: {
                readonly status: 503;
                readonly data: z.ZodObject<{
                    retryAfter: z.ZodOptional<z.ZodNumber>;
                    maintenanceWindow: z.ZodDefault<z.ZodBoolean>;
                    estimatedUptime: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly BAD_REQUEST: {
                readonly status: 400;
                readonly data: z.ZodObject<{
                    invalidFields: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    validationErrors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        message: z.ZodString;
                        code: z.ZodOptional<z.ZodString>;
                    }, z.core.$strip>>>;
                }, z.core.$strip>;
            };
            readonly NOT_FOUND: {
                readonly status: 404;
                readonly data: z.ZodObject<{
                    resource: z.ZodOptional<z.ZodString>;
                    resourceId: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly FORBIDDEN: {
                readonly status: 403;
                readonly data: z.ZodObject<{
                    requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    action: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
            readonly TIMEOUT: {
                readonly status: 504;
                readonly data: z.ZodObject<{
                    timeoutMs: z.ZodOptional<z.ZodNumber>;
                    operation: z.ZodOptional<z.ZodString>;
                    retryable: z.ZodDefault<z.ZodBoolean>;
                }, z.core.$strip>;
            };
            readonly CONNECTION_ERROR: {
                readonly status: 502;
                readonly data: z.ZodObject<{
                    errorCode: z.ZodOptional<z.ZodString>;
                    host: z.ZodOptional<z.ZodString>;
                    port: z.ZodOptional<z.ZodNumber>;
                    suggestion: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
            };
        }>>>, Record<never, never>>;
    };
};
export type ContractType = typeof contract;
