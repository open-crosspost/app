import { Outlet, createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/landing-page";
import { authClient } from "@/lib/auth-client";
import type { SessionData } from "@/lib/session";

export const Route = createFileRoute("/_layout/_crosspost")({
  component: CrosspostLayout,
});

function CrosspostLayout() {
  const { data: session } = authClient.useSession();
  const typedSession = session as SessionData | null | undefined;
  const isSignedIn = !!typedSession?.user;

  if (!isSignedIn) {
    return <LandingPage />;
  }

  return <Outlet />;
}
