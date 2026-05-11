import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import type { ReactElement } from "react";
import { toast } from "sonner";
import {
  getNearWalletDisplayFromSession,
  NEAR_ERROR_MESSAGES,
  NearAuthError,
  type NearAuthErrorCode,
  type SessionData,
  sessionQueryKey,
  sessionQueryOptions,
  signInWithNear,
  signOutAndNavigate,
  useAuthClient,
} from "@/app";
import { Button } from "@/components/ui/button";

export function ConnectToNearButton(): ReactElement {
  const queryClient = useQueryClient();
  const router = useRouter();
  const authClient = useAuthClient();
  const { data: session, isPending: sessionLoading } = useQuery(sessionQueryOptions(authClient));
  const displayAccountId = getNearWalletDisplayFromSession(session);
  const isSignedIn = !!session?.user;

  const nearMutation = useMutation({
    mutationFn: () => signInWithNear(authClient),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      const fresh = queryClient.getQueryData<SessionData | null>(sessionQueryKey);
      if (!fresh?.user) return;
      await router.invalidate();
      toast.success("Signed in with NEAR");
    },
    onError: (error) => {
      if (error instanceof NearAuthError && error.code in NEAR_ERROR_MESSAGES) {
        toast.error(NEAR_ERROR_MESSAGES[error.code as NearAuthErrorCode]);
      } else {
        toast.error(error.message || "Failed to sign in");
      }
    },
  });

  const handleClick = () => {
    if (isSignedIn) {
      void signOutAndNavigate(authClient, queryClient, router);
    } else {
      nearMutation.mutate();
    }
  };

  const busy = nearMutation.isPending || sessionLoading;

  return (
    <Button onClick={handleClick} disabled={busy} className="text-sm sm:text-base">
      <Wallet size={18} className="mr-2" />
      {isSignedIn && displayAccountId
        ? window.innerWidth < 640
          ? "Disconnect"
          : `Disconnect @${displayAccountId}`
        : busy
          ? "Connecting…"
          : "Connect NEAR"}
    </Button>
  );
}
