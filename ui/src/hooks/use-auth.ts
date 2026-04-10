import { useRouteContext } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { signOut } from "@/lib/session";

export interface UseAuthReturn {
  isSignedIn: boolean;
  currentAccountId: string | null;
  handleSignIn: () => Promise<void>;
  handleSignOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const { auth } = useRouteContext({ from: "/_layout/_authenticated" });

  const isSignedIn = auth.isAuthenticated;
  const currentAccountId = auth.user?.id ?? null;

  const handleSignIn = async () => {
    await authClient.signIn.near();
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  return {
    isSignedIn,
    currentAccountId,
    handleSignIn,
    handleSignOut,
  };
}
