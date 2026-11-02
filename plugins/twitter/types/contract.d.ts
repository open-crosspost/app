/**
 * The twitter plugin's only standing duty is the OAuth connect handoff's
 * consent URL (public client id + PKCE) — the code exchange happens inside
 * the connector's enclave (exchange_code, api/src/social/x-connect.ts), and
 * the direct-posting surface retired with ticket #21 is no longer mounted.
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
    };
};
export type ContractType = typeof contract;
