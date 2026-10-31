/**
 * The twitter plugin's only standing duty is the OAuth connect handoff
 * (the connector path, api/src/social/x-connect.ts) — the direct-posting
 * surface retired with ticket #21 is no longer mounted.
 */
export declare const contract: {
    auth: {
        getAuthUrl: any;
        exchangeCodeForToken: any;
    };
};
export type ContractType = typeof contract;
