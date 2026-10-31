/**
 * The twitter plugin's only standing duty is the OAuth connect handoff
 * (the connector path, api/src/social/x-connect.ts) — the direct-posting
 * surface retired with ticket #21 is no longer mounted.
 */
export declare const contract: {
    auth: {
        getAuthUrl: import("@orpc/contract").ProcedureContract<import("zod").ZodObject<{
            redirectUri: import("zod").ZodString;
            state: import("zod").ZodString;
            scopes: import("zod").ZodArray<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            url: import("zod").ZodString;
            state: import("zod").ZodString;
            codeVerifier: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>, object>;
        exchangeCodeForToken: import("@orpc/contract").ProcedureContract<import("zod").ZodObject<{
            code: import("zod").ZodString;
            redirectUri: import("zod").ZodString;
            codeVerifier: import("zod").ZodOptional<import("zod").ZodString>;
            scopes: import("zod").ZodArray<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            accessToken: import("zod").ZodString;
            refreshToken: import("zod").ZodOptional<import("zod").ZodString>;
            expiresAt: import("zod").ZodNumber;
            scope: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
            tokenType: import("zod").ZodString;
            userId: import("zod").ZodOptional<import("zod").ZodString>;
            username: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>, object>;
    };
};
export type ContractType = typeof contract;
