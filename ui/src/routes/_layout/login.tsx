import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Navigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { type SessionData, sessionQueryOptions, useAuthClient } from "@/app";
import { markCampaignsTourForNewUser } from "@/components/campaigns-tour";
import { Button } from "@/components/ui/button";

type SearchParams = {
  redirect?: string;
};

export const Route = createFileRoute("/_layout/login")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: ({ context, search }) => {
    const initialSession = context.session as SessionData | null | undefined;
    const session = initialSession ?? context.queryClient.getQueryData(["session"]);

    if (session?.user) {
      throw redirect({ to: search.redirect?.startsWith("/") ? search.redirect : "/", search: {} });
    }
  },
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(
      sessionQueryOptions(context.authClient, context.session),
    );
  },
  component: LoginPage,
});

async function waitForSession(authClient: ReturnType<typeof useAuthClient>) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data } = await authClient.getSession();
    if (data?.user) {
      return data;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 250));
  }
  return null;
}

function walletIsConnected(authClient: ReturnType<typeof useAuthClient>) {
  try {
    return authClient.near.isWalletConnected() || !!authClient.near.getAccountId();
  } catch {
    return false;
  }
}

async function signInWithNear(authClient: ReturnType<typeof useAuthClient>) {
  const failure: { error: Error | null } = { error: null };
  await authClient.signIn.near({
    onError: (error) => {
      failure.error = error;
    },
  });
  return failure.error;
}

function LoginPage() {
  const authClient = useAuthClient();
  const { data: session } = useQuery(sessionQueryOptions(authClient));
  const { redirect: redirectPath } = Route.useSearch();
  const [formError, setFormError] = useState<string | null>(null);

  const openSignedInApp = (message: string, userId?: string) => {
    if (userId) {
      markCampaignsTourForNewUser(userId);
    }
    toast.success(message);
    const nextPath = redirectPath?.startsWith("/") ? redirectPath : "/campaigns";
    window.location.assign(nextPath);
  };

  const nearMutation = useMutation({
    mutationFn: async () => {
      let error = await signInWithNear(authClient);
      if (error && walletIsConnected(authClient)) {
        error = await signInWithNear(authClient);
      }
      if (error) {
        throw error;
      }

      const signedInSession = await waitForSession(authClient);
      if (!signedInSession?.user) {
        throw new Error("The wallet approved the request, but this app did not create a session.");
      }
      return signedInSession;
    },
    onSuccess: (signedInSession) => {
      openSignedInApp("Signed in with NEAR", signedInSession.user.id);
    },
    onError: (error) => {
      const message = error.message || "Failed to sign in with NEAR";
      setFormError(message);
      toast.error(message);
    },
  });

  const guestMutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.signIn.anonymous();
      if (result.error) {
        throw new Error(result.error.message || "Failed to continue as guest");
      }
      const signedInSession = await waitForSession(authClient);
      if (!signedInSession?.user) {
        throw new Error("Guest sign-in finished, but this app did not create a session.");
      }
      return signedInSession;
    },
    onSuccess: (signedInSession) => {
      openSignedInApp("Signed in as guest", signedInSession.user.id);
    },
    onError: (error) => {
      const message = error.message || "Failed to continue as guest";
      setFormError(message);
      toast.error(message);
    },
  });

  const busy = nearMutation.isPending || guestMutation.isPending;

  if (session?.user) {
    if (redirectPath?.startsWith("/") && redirectPath !== "/" && redirectPath !== "/campaigns") {
      window.location.assign(redirectPath);
      return null;
    }
    return <Navigate to={redirectPath === "/" ? "/" : "/campaigns"} replace search={{}} />;
  }

  return (
    <div className="min-h-[70vh] w-full flex items-start justify-center px-6 pt-[15vh] animate-fade-in">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Welcome to Crosspost</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with your NEAR wallet to get started
          </p>
        </div>

        <div className="space-y-3">
          <Button
            className="w-full"
            size="lg"
            disabled={busy}
            onClick={() => {
              setFormError(null);
              nearMutation.mutate();
            }}
          >
            {nearMutation.isPending ? "Connecting…" : "Connect NEAR Wallet"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setFormError(null);
              guestMutation.mutate();
            }}
          >
            {guestMutation.isPending ? "Continuing…" : "Continue as Guest"}
          </Button>
        </div>

        {formError ? (
          <p className="text-sm text-destructive text-center" role="alert">
            {formError}
          </p>
        ) : null}

        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          Connect your NEAR wallet for secure, decentralized authentication
        </p>
      </div>
    </div>
  );
}
