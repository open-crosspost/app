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

const isBrowser = typeof window !== "undefined";

function createAuthClient() {
  return createBetterAuthClient({
    baseURL: getHostUrl(),
    fetchOptions: { credentials: "include" },
    plugins: [
      ...(isBrowser
        ? [
            siwnClient({
              recipient: getAccount(),
              networkId: getNetworkId(),
            }),
          ]
        : []),
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

export type SessionData =
  ReturnType<typeof createAuthClient> extends {
    $Infer: { Session: infer S };
  }
    ? S
    : never;

export const authClient: ReturnType<typeof createAuthClient> = new Proxy(
  {} as ReturnType<typeof createAuthClient>,
  {
    get(_target, prop) {
      if (prop === "then") return undefined;
      return Reflect.get(getAuthClient() as object, prop);
    },
  },
);
