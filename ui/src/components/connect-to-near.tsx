import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import type { ReactElement } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getNearWalletDisplayFromSession } from "@/lib/near-session-display";
import {
  NEAR_ERROR_MESSAGES,
  NearAuthError,
  type NearAuthErrorCode,
  type SessionData,
  sessionQueryOptions,
  signInWithNear,
  signOutAndNavigate,
} from "@/lib/session";

export function ConnectToNearButton(): ReactElement {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useQuery(sessionQueryOptions());
  const displayAccountId = getNearWalletDisplayFromSession(session);
  const isSignedIn = !!session?.user;

  const nearMutation = useMutation({
    mutationFn: signInWithNear,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryOptions().queryKey });
      const fresh = queryClient.getQueryData<SessionData | null>(sessionQueryOptions().queryKey);
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
      void signOutAndNavigate(queryClient, router);
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
