import { apiKeyClient } from "@better-auth/api-key/client";
import { passkeyClient } from "@better-auth/passkey/client";
import {
  adminClient,
  anonymousClient,
  organizationClient,
  phoneNumberClient,
} from "better-auth/client/plugins";
import { createAuthClient as createBetterAuthClient } from "better-auth/react";
import { siwnClient } from "better-near-auth/client";
import { getAccount, getHostUrl, getNetworkId } from "@/app";

function createAuthClient() {
  return createBetterAuthClient({
    baseURL: getHostUrl(),
    fetchOptions: { credentials: "include" },
    plugins: [
      siwnClient({
        recipient: getAccount(),
        networkId: getNetworkId(),
      }),
      adminClient(),
      anonymousClient(),
      phoneNumberClient(),
      passkeyClient(),
      organizationClient(),
      apiKeyClient(),
    ],
  });
}

let _authClient: ReturnType<typeof createAuthClient> | undefined;

export function getAuthClient() {
  if (_authClient === undefined) {
    _authClient = createAuthClient();
  }
  return _authClient;
}

export const authClient: ReturnType<typeof createAuthClient> = new Proxy(
  {} as ReturnType<typeof createAuthClient>,
  {
    get(_target, prop) {
      if (prop === "then") return undefined;
      const client = getAuthClient() as unknown as Record<string, unknown>;
      const value = client[prop as string];
      if (typeof value === "function") {
        return (...args: unknown[]) => (value as (...a: unknown[]) => unknown)(...args);
      }
      return value;
    },
  },
);
