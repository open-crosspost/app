import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import type { ReactElement } from "react";
import { toast } from "sonner";
import { type SessionData, sessionQueryKey, sessionQueryOptions, useAuthClient } from "@/app";
import { markCampaignsTourForNewUser } from "@/components/campaigns-tour";
import { Button } from "@/components/ui/button";

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

type ConnectToNearButtonProps = {
  className?: string;
  redirectTo?: string;
};

export function ConnectToNearButton({
  className,
  redirectTo = "/campaigns",
}: ConnectToNearButtonProps): ReactElement {
  const queryClient = useQueryClient();
  const router = useRouter();
  const authClient = useAuthClient();
  const { data: session, isPending: sessionLoading } = useQuery(sessionQueryOptions(authClient));
  const displayAccountId = session?.user?.name ?? null;
  const isSignedIn = !!session?.user;

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
    onSuccess: async (signedInSession) => {
      markCampaignsTourForNewUser(signedInSession.user.id);
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      await router.invalidate();
      toast.success("Signed in with NEAR");
      window.location.assign(redirectTo.startsWith("/") ? redirectTo : "/campaigns");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to sign in with NEAR");
    },
  });

  const handleClick = () => {
    if (isSignedIn) {
      void (async () => {
        await authClient.signOut();
        await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
        await router.invalidate();
      })();
      return;
    }
    nearMutation.mutate();
  };

  const busy = nearMutation.isPending || sessionLoading;

  return (
    <Button
      onClick={handleClick}
      disabled={busy}
      className={
        className ??
        "h-9 min-w-fit gap-2 px-3 sm:px-4 py-2 shadow-[2px_2px_0_0_rgb(0,0,0)] dark:shadow-[2px_2px_0_0_rgba(255,255,255,0.3)]"
      }
    >
      <Wallet size={16} aria-hidden />
      {isSignedIn && displayAccountId
        ? "Disconnect"
        : busy
          ? "Connecting…"
          : "Connect NEAR"}
    </Button>
  );
}
