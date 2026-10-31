import "@orpc/openapi/extensions/route";
import { z } from "zod";
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
        paymentKey: z.ZodString;
        nonce: z.ZodNumber;
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
