import { apiKeyClient } from "@better-auth/api-key/client";
import { passkeyClient } from "@better-auth/passkey/client";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { BetterAuthClientPlugin } from "better-auth/client";
import {
  adminClient,
  anonymousClient,
  inferAdditionalFields,
  organizationClient,
  phoneNumberClient,
} from "better-auth/client/plugins";
import { createAuthClient as createBetterAuthClient } from "better-auth/react";
import { type SIWNClientActions, siwnClient } from "better-near-auth/client";
import type { ClientRuntimeConfig } from "everything-dev/types";
import { getRuntimeConfig } from "everything-dev/ui/runtime";
import type { Auth } from "./auth-types.gen";

function readRuntimeConfig(config?: Partial<ClientRuntimeConfig>) {
  if (config) return config;
  if (typeof window === "undefined") return undefined;
  try {
    return getRuntimeConfig();
  } catch {
    return undefined;
  }
}

function getAccountId(config?: Partial<ClientRuntimeConfig>) {
  return readRuntimeConfig(config)?.account ?? "every.near";
}

function getNetworkId(config?: Partial<ClientRuntimeConfig>): "mainnet" | "testnet" {
  const networkId = readRuntimeConfig(config)?.networkId;
  if (networkId === "mainnet" || networkId === "testnet") return networkId;
  return getAccountId(config).endsWith(".testnet") ? "testnet" : "mainnet";
}

function getHostUrl(config?: Partial<ClientRuntimeConfig>) {
  const runtimeConfig = readRuntimeConfig(config);
  if (runtimeConfig?.hostUrl) return runtimeConfig.hostUrl;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

function withNearActions<T>(client: T): T & SIWNClientActions {
  return client as T & SIWNClientActions;
}

export function createAuthClient(config?: Partial<ClientRuntimeConfig>) {
  return withNearActions(
    createBetterAuthClient({
      baseURL: getHostUrl(config),
      fetchOptions: { credentials: "include" },
      plugins: [
        inferAdditionalFields<Auth>(),
        siwnClient({
          recipient: getAccountId(config),
          networkId: getNetworkId(config),
        }) as unknown as BetterAuthClientPlugin,
        adminClient(),
        anonymousClient(),
        phoneNumberClient(),
        passkeyClient(),
        organizationClient(),
        apiKeyClient(),
      ],
    }),
  );
}
export type AuthClient = ReturnType<typeof createAuthClient>;
type OrganizationListResult = Awaited<ReturnType<AuthClient["organization"]["list"]>>;
type PasskeyListResult = Awaited<ReturnType<AuthClient["passkey"]["listUserPasskeys"]>>;

export type SessionData = AuthClient["$Infer"]["Session"];
export type Organization = NonNullable<OrganizationListResult["data"]>[number];
export type Passkey = NonNullable<PasskeyListResult["data"]>[number];
export type NearActions = SIWNClientActions["near"];

export function getNearActions(authClient: AuthClient): NearActions {
  return authClient.near as NearActions;
}

export function getNearAccountIdFromSession(
  session: { user?: unknown } | null | undefined,
): string | null {
  const user = session?.user as
    | { nearAccount?: { accountId?: string }; name?: string; id?: string }
    | undefined;
  return user?.nearAccount?.accountId ?? null;
}

export function getNearWalletDisplayFromSession(
  session: { user?: unknown } | null | undefined,
): string | null {
  const user = session?.user as
    | { nearAccount?: { accountId?: string }; name?: string; id?: string }
    | undefined;
  return getNearAccountIdFromSession(session) ?? user?.name ?? user?.id ?? null;
}

export function useAuthClient(): AuthClient {
  return useRouter().options.context.authClient;
}

export const sessionQueryKey = ["session"] as const;

export function sessionQueryOptions(authClient: AuthClient, initialSession?: SessionData | null) {
  const baseOptions = {
    queryKey: sessionQueryKey,
    queryFn: async () => {
      const { data: session } = await authClient.getSession();
      return session ?? null;
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  };

  return initialSession === undefined
    ? baseOptions
    : { ...baseOptions, initialData: initialSession };
}

export function useRelayHistory(session: SessionData | null | undefined, authClient: AuthClient) {
  return useQuery({
    queryKey: ["relay-history"],
    queryFn: async () => {
      const res = await getNearActions(authClient).relayHistory();
      return (res?.data?.transactions ?? []) as Array<{
        id: string;
        userId: string;
        txHash: string;
        senderId: string;
        receiverId: string;
        network: string;
        status: string;
        gasUsed?: string;
        createdAt: string;
        updatedAt?: string;
      }>;
    },
    enabled: !!session,
    refetchInterval: 2000,
  });
}

export type NearAuthErrorCode =
  | "UNAUTHORIZED_NONCE_REPLAY"
  | "UNAUTHORIZED_INVALID_SIGNATURE"
  | "SIGNER_NOT_AVAILABLE"
  | "WALLET_NOT_CONNECTED";

export const NEAR_ERROR_MESSAGES: Record<NearAuthErrorCode, string> = {
  UNAUTHORIZED_NONCE_REPLAY: "Sign-in already used",
  UNAUTHORIZED_INVALID_SIGNATURE: "Invalid signature",
  SIGNER_NOT_AVAILABLE: "NEAR wallet not available",
  WALLET_NOT_CONNECTED: "Wallet not connected",
};

export class NearAuthError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "NearAuthError";
    this.code = code;
  }
}

const CANCEL_PATTERNS = [
  "closed the window",
  "wallet closed",
  "user rejected",
  "user cancelled",
  "didn't complete the action",
  "closed the modal",
  "popup window failed to open",
  "refused to allow the popup",
  "wallet not found",
];

function isUserCancellation(message: string): boolean {
  const lower = message.toLowerCase();
  return CANCEL_PATTERNS.some((p) => lower.includes(p));
}

export function signInWithNear(authClient: AuthClient): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    authClient.signIn.near({
      onSuccess: () => {
        if (settled) return;
        settled = true;
        resolve();
      },
      onError: (error: { message?: string; code?: string }) => {
        if (settled) return;
        const msg = error?.message ?? "";
        if (isUserCancellation(msg)) {
          settled = true;
          resolve();
          return;
        }
        settled = true;
        reject(new NearAuthError(error?.code ?? "UNKNOWN", msg || "Failed to sign in"));
      },
    });
  });
}

export async function signInAnonymous(authClient: AuthClient) {
  const { error } = await authClient.signIn.anonymous();
  if (error) throw new Error(error.message || "Failed to sign in anonymously");
}

export async function signOutAndNavigate(
  authClient: AuthClient,
  queryClient: { invalidateQueries: (opts: { queryKey: readonly unknown[] }) => Promise<void> },
  router: { invalidate: () => Promise<void> },
) {
  await authClient.signOut();
  await authClient.near.disconnect().catch(() => {});
  await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
  await router.invalidate();
}

export function getRedirectUrl(redirect?: string): string {
  return redirect?.startsWith("/") ? redirect : "/";
}
