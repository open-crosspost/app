import { Wallet } from "lucide-react";
import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { signOut } from "@/lib/session";

export function ConnectToNearButton(): ReactElement {
  const { data: session } = authClient.useSession();
  const currentAccountId = session?.user?.id ?? null;
  const isSignedIn = !!session?.user;

  const handleSignIn = async () => {
    await authClient.signIn.near();
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  const handleClick = () => {
    console.log("Connect button clicked, isSignedIn:", isSignedIn);
    if (isSignedIn) {
      handleSignOut();
    } else {
      handleSignIn();
    }
  };

  return (
    <Button onClick={handleClick} className="text-sm sm:text-base">
      <Wallet size={18} className="mr-2" />
      {isSignedIn && currentAccountId
        ? window.innerWidth < 640
          ? "Disconnect"
          : `Disconnect @${currentAccountId}`
        : "Connect NEAR"}
    </Button>
  );
}
