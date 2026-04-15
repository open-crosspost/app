import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import type { ReactElement } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { getNearWalletDisplayFromSession } from "@/lib/near-session-display";
import { sessionQueryOptions, signOut } from "@/lib/session";

export function ConnectToNearButton(): ReactElement {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session, refetch: refetchSession, isPending: sessionLoading } = authClient.useSession();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const displayAccountId = getNearWalletDisplayFromSession(session);
  const isSignedIn = !!session?.user;

  const handleSignIn = () => {
    setIsSigningIn(true);
    authClient.signIn.near({
      onSuccess: async () => {
        try {
          await refetchSession();
          await queryClient.invalidateQueries({ queryKey: sessionQueryOptions().queryKey });
          await router.invalidate();
          toast.success("Signed in with NEAR");
        } finally {
          setIsSigningIn(false);
        }
      },
      onError: (error) => {
        setIsSigningIn(false);
        if (error.code === "UNAUTHORIZED_NONCE_REPLAY") {
          toast.error("Sign-in already used");
        } else if (error.code === "UNAUTHORIZED_INVALID_SIGNATURE") {
          toast.error("Invalid signature");
        } else if (error.code === "SIGNER_NOT_AVAILABLE") {
          toast.error("NEAR wallet not available");
        } else {
          toast.error(error.message || "Failed to sign in");
        }
      },
    });
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  const handleClick = () => {
    if (isSignedIn) {
      void handleSignOut();
    } else {
      handleSignIn();
    }
  };

  const busy = isSigningIn || sessionLoading;

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
