import { Platform } from "@crosspost/plugin/types";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApiClient } from "@/app";
import { Button } from "@/components/ui/button";
import { socialAccountsQueryKey, X_CONNECT_WALLET_KEY_STORAGE_KEY } from "@/lib/social";

type XCallbackSearch = {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
};

type ConnectResult = {
  scope: string[];
  xUserId: string;
  username?: string;
};

type CallbackStatus =
  | { kind: "pending" }
  | { kind: "connected"; result: ConnectResult }
  | { kind: "error"; message: string };

export const Route = createFileRoute("/_layout/_authenticated/callback/x")({
  validateSearch: (search: Record<string, unknown>): XCallbackSearch => ({
    code: typeof search.code === "string" ? search.code : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
    error_description:
      typeof search.error_description === "string" ? search.error_description : undefined,
  }),
  component: XCallbackPage,
});

function XCallbackPage() {
  const { code, state, error, error_description } = Route.useSearch();
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const hasRun = useRef(false);
  const [status, setStatus] = useState<CallbackStatus>({ kind: "pending" });

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const walletApiKey = sessionStorage.getItem(X_CONNECT_WALLET_KEY_STORAGE_KEY);
    const clearStoredWalletKey = () => sessionStorage.removeItem(X_CONNECT_WALLET_KEY_STORAGE_KEY);

    if (error) {
      clearStoredWalletKey();
      setStatus({
        kind: "error",
        message: error_description || `X authorization was not completed (${error}).`,
      });
      return;
    }

    if (!code || !state) {
      clearStoredWalletKey();
      setStatus({ kind: "error", message: "The X callback is missing its code or state." });
      return;
    }

    if (!walletApiKey) {
      setStatus({
        kind: "error",
        message: "Your OutLayer wallet API key was not found. Start the connection again.",
      });
      return;
    }

    apiClient.social.accounts
      .callback({ platform: Platform.TWITTER, code, state, walletApiKey })
      .then((result) => {
        clearStoredWalletKey();
        setStatus({ kind: "connected", result });
        void queryClient.invalidateQueries({ queryKey: socialAccountsQueryKey });
      })
      .catch((callbackError: unknown) => {
        clearStoredWalletKey();
        setStatus({
          kind: "error",
          message:
            callbackError instanceof Error && callbackError.message
              ? callbackError.message
              : "Failed to connect your X account.",
        });
      });
  }, [apiClient, queryClient, code, state, error, error_description]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold">Connect X Account</h1>
      </div>

      {status.kind === "pending" && (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <RefreshCw size={16} className="animate-spin" />
          Connecting your X account...
        </div>
      )}

      {status.kind === "connected" && (
        <div className="rounded-md border bg-card p-4 text-card-foreground space-y-3">
          <div className="flex items-center gap-2 text-lg font-medium">
            <CheckCircle2 size={20} className="text-success" />
            connected ✓
          </div>
          <p className="text-sm text-muted-foreground">
            Account: {status.result.username ? `@${status.result.username}` : status.result.xUserId}
          </p>
          <p className="text-sm text-muted-foreground">
            Granted scope: {status.result.scope.join(", ")}
          </p>
          <Button asChild>
            <Link to="/manage">Back to Manage Accounts</Link>
          </Button>
        </div>
      )}

      {status.kind === "error" && (
        <div className="rounded-md border bg-card p-4 text-card-foreground space-y-3">
          <div className="flex items-center gap-2 text-lg font-medium">
            <AlertCircle size={20} className="text-destructive" />X connection failed
          </div>
          <p className="text-sm text-muted-foreground">{status.message}</p>
          <Button asChild>
            <Link to="/manage">Back to Manage Accounts</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
