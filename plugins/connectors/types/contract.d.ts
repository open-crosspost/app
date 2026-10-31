import "@orpc/openapi/extensions/route";
import { z } from "zod";
/**
 * Metered-connectors bridge contract.
 *
 * This plugin owns ONLY the OutLayer side of the demo: reading the agent's
 * Agent Connect budget, topping up the OutLayer payment key from the agent's
 * balance, and metered connector calls. Agent account management lives in the
 * `agent-connect` plugin — no duplicated owner intents here.
 */
/**
 * Where users buy the XPOST gate token — same link the site footer shows.
 */
export declare const XPOST_BUY_URL = "https://meme.cooking/meme/1634";
export declare const GateRefusalDataSchema: z.ZodObject<{
    reason: z.ZodEnum<{
        balance_too_low: "balance_too_low";
        no_near_account: "no_near_account";
    }>;
    minimum: z.ZodString;
    balance: z.ZodNullable<z.ZodString>;
    buyUrl: z.ZodString;
}, z.core.$strip>;
export type GateRefusalData = z.infer<typeof GateRefusalDataSchema>;
/**
 * The XPOST admission gate refused app-paid dispatch before any spend — the
 * call is free, the payload explains the remedy (buy XPOST, sign in, or BYO).
 */
export declare const GATE_REFUSED: {
    readonly status: 402;
    readonly data: z.ZodObject<{
        reason: z.ZodEnum<{
            balance_too_low: "balance_too_low";
            no_near_account: "no_near_account";
        }>;
        minimum: z.ZodString;
        balance: z.ZodNullable<z.ZodString>;
        buyUrl: z.ZodString;
    }, z.core.$strip>;
};
export declare const contract: {
    agentBudget: import("@orpc/contract").ProcedureContract<z.ZodObject<{
        agentId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        agentId: z.ZodString;
        daily: z.ZodNullable<z.ZodObject<{
            limitUsd: z.ZodNullable<z.ZodString>;
            spentUsd: z.ZodNullable<z.ZodString>;
            remainingUsd: z.ZodNullable<z.ZodString>;
            resetsAt: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
        weekly: z.ZodNullable<z.ZodObject<{
            limitUsd: z.ZodNullable<z.ZodString>;
            spentUsd: z.ZodNullable<z.ZodString>;
            remainingUsd: z.ZodNullable<z.ZodString>;
            resetsAt: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
        monthly: z.ZodNullable<z.ZodObject<{
            limitUsd: z.ZodNullable<z.ZodString>;
            spentUsd: z.ZodNullable<z.ZodString>;
            remainingUsd: z.ZodNullable<z.ZodString>;
            resetsAt: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, {
        UNAUTHORIZED: {
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
        BAD_REQUEST: {
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
        CONNECTION_ERROR: {
            readonly status: 502;
            readonly data: z.ZodObject<{
                errorCode: z.ZodOptional<z.ZodString>;
                host: z.ZodOptional<z.ZodString>;
                port: z.ZodOptional<z.ZodNumber>;
                suggestion: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        };
    }>;
    agentTopup: import("@orpc/contract").ProcedureContract<z.ZodObject<{
        agentId: z.ZodString;
        outlayerWalletId: z.ZodString;
        amountNear: z.ZodString;
        idempotencyKey: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        correlationId: z.ZodString;
        status: z.ZodString;
        amountNear: z.ZodString;
        to: z.ZodString;
    }, z.core.$strip>, {
        UNAUTHORIZED: {
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
        BAD_REQUEST: {
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
        CONNECTION_ERROR: {
            readonly status: 502;
            readonly data: z.ZodObject<{
                errorCode: z.ZodOptional<z.ZodString>;
                host: z.ZodOptional<z.ZodString>;
                port: z.ZodOptional<z.ZodNumber>;
                suggestion: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        };
    }>;
    outlayerWalletSetup: import("@orpc/contract").ProcedureContract<z.ZodObject<{
        agentId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        created: z.ZodBoolean;
        walletId: z.ZodNullable<z.ZodString>;
        nearAccountId: z.ZodString;
        keySource: z.ZodEnum<{
            none: "none";
            trial: "trial";
        }>;
    }, z.core.$strip>, {
        UNAUTHORIZED: {
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
        BAD_REQUEST: {
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
        CONNECTION_ERROR: {
            readonly status: 502;
            readonly data: z.ZodObject<{
                errorCode: z.ZodOptional<z.ZodString>;
                host: z.ZodOptional<z.ZodString>;
                port: z.ZodOptional<z.ZodNumber>;
                suggestion: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        };
    }>;
    outlayerWalletConnect: import("@orpc/contract").ProcedureContract<z.ZodObject<{
        agentId: z.ZodString;
        walletApiKey: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        walletId: z.ZodNullable<z.ZodString>;
        nearAccountId: z.ZodString;
        keySource: z.ZodEnum<{
            funded: "funded";
            none: "none";
            trial: "trial";
        }>;
    }, z.core.$strip>, {
        UNAUTHORIZED: {
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
        BAD_REQUEST: {
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
        CONNECTION_ERROR: {
            readonly status: 502;
            readonly data: z.ZodObject<{
                errorCode: z.ZodOptional<z.ZodString>;
                host: z.ZodOptional<z.ZodString>;
                port: z.ZodOptional<z.ZodNumber>;
                suggestion: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        };
    }>;
    bridgeInfo: import("@orpc/contract").ProcedureContract<z.ZodObject<{
        agentId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        wallet: z.ZodNullable<z.ZodObject<{
            nearAccountId: z.ZodString;
            walletId: z.ZodNullable<z.ZodString>;
            paymentKey: z.ZodNullable<z.ZodString>;
            keySource: z.ZodNullable<z.ZodString>;
            connectedAt: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>, {
        UNAUTHORIZED: {
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
        CONNECTION_ERROR: {
            readonly status: 502;
            readonly data: z.ZodObject<{
                errorCode: z.ZodOptional<z.ZodString>;
                host: z.ZodOptional<z.ZodString>;
                port: z.ZodOptional<z.ZodNumber>;
                suggestion: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        };
    }>;
    recordWalletTopup: import("@orpc/contract").ProcedureContract<z.ZodObject<{
        agentId: z.ZodString;
        txHash: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
    }, z.core.$strip>, {
        UNAUTHORIZED: {
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
        CONNECTION_ERROR: {
            readonly status: 502;
            readonly data: z.ZodObject<{
                errorCode: z.ZodOptional<z.ZodString>;
                host: z.ZodOptional<z.ZodString>;
                port: z.ZodOptional<z.ZodNumber>;
                suggestion: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        };
    }>;
    outlayerPaymentKey: import("@orpc/contract").ProcedureContract<z.ZodObject<{
        agentId: z.ZodOptional<z.ZodString>;
        walletApiKey: z.ZodOptional<z.ZodString>;
        initialDepositUsdc: z.ZodOptional<z.ZodString>;
        initialDepositNear: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        nonce: z.ZodNumber;
        stored: z.ZodBoolean;
        keySource: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>, {
        UNAUTHORIZED: {
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
        BAD_REQUEST: {
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
        CONNECTION_ERROR: {
            readonly status: 502;
            readonly data: z.ZodObject<{
                errorCode: z.ZodOptional<z.ZodString>;
                host: z.ZodOptional<z.ZodString>;
                port: z.ZodOptional<z.ZodNumber>;
                suggestion: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        };
    }>;
    outlayerAppWalletAttach: import("@orpc/contract").ProcedureContract<z.ZodObject<{
        agentId: z.ZodString;
        rowProfile: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        attached: z.ZodBoolean;
        walletAccountId: z.ZodString;
    }, z.core.$strip>, {
        UNAUTHORIZED: {
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
        BAD_REQUEST: {
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
        CONNECTION_ERROR: {
            readonly status: 502;
            readonly data: z.ZodObject<{
                errorCode: z.ZodOptional<z.ZodString>;
                host: z.ZodOptional<z.ZodString>;
                port: z.ZodOptional<z.ZodNumber>;
                suggestion: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        };
    }>;
    outlayerCall: import("@orpc/contract").ProcedureContract<z.ZodObject<{
        walletId: z.ZodOptional<z.ZodString>;
        paymentKey: z.ZodOptional<z.ZodString>;
        agentId: z.ZodString;
        connector: z.ZodString;
        operation: z.ZodString;
        secretsRef: z.ZodOptional<z.ZodObject<{
            accountId: z.ZodString;
            profile: z.ZodString;
        }, z.core.$strip>>;
        input: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strip>, z.ZodObject<{
        callId: z.ZodString;
        status: z.ZodString;
        keySource: z.ZodNullable<z.ZodString>;
        computeCost: z.ZodNullable<z.ZodString>;
        output: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        error: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>, {
        UNAUTHORIZED: {
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
        BAD_REQUEST: {
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
        CONNECTION_ERROR: {
            readonly status: 502;
            readonly data: z.ZodObject<{
                errorCode: z.ZodOptional<z.ZodString>;
                host: z.ZodOptional<z.ZodString>;
                port: z.ZodOptional<z.ZodNumber>;
                suggestion: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        };
        GATE_REFUSED: {
            readonly status: 402;
            readonly data: z.ZodObject<{
                reason: z.ZodEnum<{
                    balance_too_low: "balance_too_low";
                    no_near_account: "no_near_account";
                }>;
                minimum: z.ZodString;
                balance: z.ZodNullable<z.ZodString>;
                buyUrl: z.ZodString;
            }, z.core.$strip>;
        };
    }>;
    xpostGateStatus: import("@orpc/contract").ProcedureContract<z.ZodOptional<z.ZodObject<{}, z.core.$strip>>, z.ZodObject<{
        enabled: z.ZodBoolean;
        tier1: z.ZodString;
        tier2: z.ZodString;
        tier3: z.ZodString;
        source: z.ZodString;
        priceUsd: z.ZodNullable<z.ZodString>;
        refreshedAt: z.ZodNullable<z.ZodString>;
        caller: z.ZodObject<{
            nearAccountId: z.ZodNullable<z.ZodString>;
            balance: z.ZodNullable<z.ZodString>;
            tier: z.ZodNullable<z.ZodNumber>;
        }, z.core.$strip>;
    }, z.core.$strip>, {
        BAD_REQUEST: {
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
        CONNECTION_ERROR: {
            readonly status: 502;
            readonly data: z.ZodObject<{
                errorCode: z.ZodOptional<z.ZodString>;
                host: z.ZodOptional<z.ZodString>;
                port: z.ZodOptional<z.ZodNumber>;
                suggestion: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        };
    }>;
    xpostGateConfigSet: import("@orpc/contract").ProcedureContract<z.ZodObject<{
        tier1: z.ZodString;
        tier2: z.ZodString;
        tier3: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        tier1: z.ZodString;
        tier2: z.ZodString;
        tier3: z.ZodString;
        source: z.ZodString;
        priceUsd: z.ZodNullable<z.ZodString>;
        refreshedAt: z.ZodString;
    }, z.core.$strip>, {
        UNAUTHORIZED: {
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
        FORBIDDEN: {
            readonly status: 403;
            readonly data: z.ZodObject<{
                requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                action: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        };
        BAD_REQUEST: {
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
        CONNECTION_ERROR: {
            readonly status: 502;
            readonly data: z.ZodObject<{
                errorCode: z.ZodOptional<z.ZodString>;
                host: z.ZodOptional<z.ZodString>;
                port: z.ZodOptional<z.ZodNumber>;
                suggestion: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        };
    }>;
    xpostGateConfigRefresh: import("@orpc/contract").ProcedureContract<import("@orpc/contract").InitialInputSchema, z.ZodObject<{
        tier1: z.ZodString;
        tier2: z.ZodString;
        tier3: z.ZodString;
        source: z.ZodString;
        priceUsd: z.ZodNullable<z.ZodString>;
        refreshedAt: z.ZodString;
    }, z.core.$strip>, {
        UNAUTHORIZED: {
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
        FORBIDDEN: {
            readonly status: 403;
            readonly data: z.ZodObject<{
                requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                action: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        };
        BAD_REQUEST: {
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
        CONNECTION_ERROR: {
            readonly status: 502;
            readonly data: z.ZodObject<{
                errorCode: z.ZodOptional<z.ZodString>;
                host: z.ZodOptional<z.ZodString>;
                port: z.ZodOptional<z.ZodNumber>;
                suggestion: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        };
    }>;
    sponsorStats: import("@orpc/contract").ProcedureContract<z.ZodOptional<z.ZodObject<{}, z.core.$strip>>, z.ZodObject<{
        sponsoredPosts: z.ZodNumber;
        sponsoredUsdMicros: z.ZodString;
        lastSponsoredAt: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>, {
        CONNECTION_ERROR: {
            readonly status: 502;
            readonly data: z.ZodObject<{
                errorCode: z.ZodOptional<z.ZodString>;
                host: z.ZodOptional<z.ZodString>;
                port: z.ZodOptional<z.ZodNumber>;
                suggestion: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        };
    }>;
    appSponsorStatus: import("@orpc/contract").ProcedureContract<z.ZodOptional<z.ZodObject<{}, z.core.$strip>>, z.ZodObject<{
        configured: z.ZodBoolean;
        walletOwner: z.ZodNullable<z.ZodString>;
        keyNonce: z.ZodNullable<z.ZodString>;
        nearBalanceYocto: z.ZodNullable<z.ZodString>;
        nearBalanceNear: z.ZodNullable<z.ZodString>;
        outlayerKeyRemainingUsd: z.ZodNullable<z.ZodString>;
        windows: z.ZodObject<{
            day: z.ZodObject<{
                posts: z.ZodNumber;
                usdMicros: z.ZodString;
            }, z.core.$strip>;
            week: z.ZodObject<{
                posts: z.ZodNumber;
                usdMicros: z.ZodString;
            }, z.core.$strip>;
            month: z.ZodObject<{
                posts: z.ZodNumber;
                usdMicros: z.ZodString;
            }, z.core.$strip>;
        }, z.core.$strip>;
        daily: z.ZodArray<z.ZodObject<{
            date: z.ZodString;
            posts: z.ZodNumber;
            usdMicros: z.ZodString;
        }, z.core.$strip>>;
        thresholds: z.ZodObject<{
            warnNear: z.ZodString;
            warnUsd: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, {
        UNAUTHORIZED: {
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
        FORBIDDEN: {
            readonly status: 403;
            readonly data: z.ZodObject<{
                requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                action: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        };
        CONNECTION_ERROR: {
            readonly status: 502;
            readonly data: z.ZodObject<{
                errorCode: z.ZodOptional<z.ZodString>;
                host: z.ZodOptional<z.ZodString>;
                port: z.ZodOptional<z.ZodNumber>;
                suggestion: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        };
    }>;
    events: import("@orpc/contract").ProcedureContract<z.ZodObject<{
        agentId: z.ZodString;
        limit: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    }, z.core.$strip>, z.ZodObject<{
        data: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            kind: z.ZodString;
            agentId: z.ZodString;
            usdCents: z.ZodString;
            outlayerCostMicros: z.ZodNullable<z.ZodString>;
            balanceRemainingUsd: z.ZodNullable<z.ZodString>;
            outlayerKeyRemaining: z.ZodNullable<z.ZodString>;
            connector: z.ZodNullable<z.ZodString>;
            operation: z.ZodNullable<z.ZodString>;
            createdAt: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>, {
        UNAUTHORIZED: {
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
        CONNECTION_ERROR: {
            readonly status: 502;
            readonly data: z.ZodObject<{
                errorCode: z.ZodOptional<z.ZodString>;
                host: z.ZodOptional<z.ZodString>;
                port: z.ZodOptional<z.ZodNumber>;
                suggestion: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        };
    }>;
};
export type ContractType = typeof contract;
