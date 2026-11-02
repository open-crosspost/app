import { platformContract } from "@crosspost/plugin/platform-contract";
import { oc } from "@orpc/contract";

/**
 * The twitter plugin's only standing duty is the OAuth connect handoff's
 * consent URL (public client id + PKCE) — the code exchange happens inside
 * the connector's enclave (exchange_code, api/src/social/x-connect.ts), and
 * the direct-posting surface retired with ticket #21 is no longer mounted.
 */
export const contract = oc.router({
  auth: {
    getAuthUrl: platformContract.auth.getAuthUrl,
  },
});

export type ContractType = typeof contract;
