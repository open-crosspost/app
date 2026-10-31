import { Platform } from "@crosspost/plugin/types";
import { createFileRoute, type ErrorComponentProps, Link } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { socialAccountsQueryKey, X_CONNECT_WALLET_KEY_STORAGE_KEY } from "@/lib/social";

type XCallbackSearch = {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
};

class XCallbackError extends Error {}

export const Route = createFileRoute("/_authenticated/callback/x")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): XCallbackSearch => ({
    code: typeof search.code === "string" ? search.code : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
    error_description:
      typeof search.error_description === "string" ? search.error_description : undefined,
  }),
  loaderDeps: ({ search }) => ({
    code: search.code,
    state: search.state,
    error: search.error,
    errorDescription: search.error_description,
  }),
  loader: async ({ context, deps }) => {
    const walletApiKey = sessionStorage.getItem(X_CONNECT_WALLET_KEY_STORAGE_KEY);
    const clearStoredWalletKey = () => sessionStorage.removeItem(X_CONNECT_WALLET_KEY_STORAGE_KEY);

    const fail = (message: string): XCallbackError => {
      clearStoredWalletKey();
      return new XCallbackError(message);
    };

    if (deps.error) {
      throw fail(deps.errorDescription || `X authorization was not completed (${deps.error}).`);
    }

    if (!deps.code || !deps.state) {
      throw fail("The X callback is missing its code or state.");
    }

    try {
      const result = await context.apiClient.social.accounts.callback({
        platform: Platform.TWITTER,
        code: deps.code,
        state: deps.state,
        ...(walletApiKey ? { walletApiKey } : {}),
      });
      clearStoredWalletKey();
      void context.queryClient.invalidateQueries({ queryKey: socialAccountsQueryKey });
      return { result };
    } catch (callbackError) {
      throw fail(
        callbackError instanceof Error && callbackError.message
          ? callbackError.message
          : "Failed to connect your X account.",
      );
    }
  },
  pendingComponent: CallbackPending,
  errorComponent: CallbackError,
  component: XCallbackPage,
});

function CallbackPending() {
  return (
    <CallbackFrame>
      <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
        <RefreshCw size={16} className="animate-spin" />
        Connecting your X account...
      </div>
    </CallbackFrame>
  );
}

function CallbackError({ error }: ErrorComponentProps) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <CallbackFrame>
      <div className="rounded-md border bg-card p-4 text-card-foreground space-y-3">
        <div className="flex items-center gap-2 text-lg font-medium">
          <AlertCircle size={20} className="text-destructive" />X connection failed
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
        <BackToManage />
      </div>
    </CallbackFrame>
  );
}

function BackToManage() {
  return (
    <Button asChild>
      <Link to="/manage">Back to Manage Accounts</Link>
    </Button>
  );
}

function CallbackFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold">Connect X Account</h1>
      </div>
      {children}
    </div>
  );
}

function XCallbackPage() {
  const { result } = Route.useLoaderData();

  return (
    <CallbackFrame>
      <div className="rounded-md border bg-card p-4 text-card-foreground space-y-3">
        <div className="flex items-center gap-2 text-lg font-medium">
          <CheckCircle2 size={20} className="text-success" />
          connected ✓
        </div>
        <p className="text-sm text-muted-foreground">
          Account: {result.username ? `@${result.username}` : result.xUserId}
        </p>
        <p className="text-sm text-muted-foreground">Granted scope: {result.scope.join(", ")}</p>
        <BackToManage />
      </div>
    </CallbackFrame>
  );
}
