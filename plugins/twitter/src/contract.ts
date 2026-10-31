import { platformContract } from "@crosspost/plugin/platform-contract";
import { oc } from "@orpc/contract";

/**
 * The twitter plugin's only standing duty is the OAuth connect handoff
 * (the connector path, api/src/social/x-connect.ts) — the direct-posting
 * surface retired with ticket #21 is no longer mounted.
 */
export const contract = oc.router({
  auth: {
    getAuthUrl: platformContract.auth.getAuthUrl,
    exchangeCodeForToken: platformContract.auth.exchangeCodeForToken,
  },
});

export type ContractType = typeof contract;
