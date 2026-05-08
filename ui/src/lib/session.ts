import { getAuthClient, type SessionData } from "@/app";

export type { SessionData };

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

export const sessionQueryKey = ["session"] as const;

export const sessionQueryOptions = (initialSession?: SessionData | null) => ({
  queryKey: sessionQueryKey,
  queryFn: async () => {
    const { data: session } = await getAuthClient().getSession();
    return session ?? null;
  },
  staleTime: 60 * 1000,
  gcTime: 10 * 60 * 1000,
  initialData: initialSession,
});

export function getRedirectUrl(redirect?: string): string {
  return redirect?.startsWith("/") ? redirect : "/";
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

export function signInWithNear(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false;

    getAuthClient().signIn.near({
      onSuccess: () => {
        if (settled) return;
        settled = true;
        resolve();
      },
      onError: (error) => {
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

export async function signInAnonymous() {
  const { error } = await getAuthClient().signIn.anonymous();
  if (error) throw new Error(error.message || "Failed to sign in anonymously");
}

export async function signOut() {
  await getAuthClient().signOut();
  await getAuthClient().near.disconnect().catch(() => {});
}

export async function signOutAndNavigate(
  queryClient: { invalidateQueries: (opts: { queryKey: readonly unknown[] }) => Promise<void> },
  router: { invalidate: () => Promise<void> },
) {
  await signOut();
  await queryClient.invalidateQueries({ queryKey: sessionQueryOptions().queryKey });
  await router.invalidate();
}
