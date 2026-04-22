import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LandingPage } from "@/components/landing-page";
import { getSessionFromData, type SessionData } from "@/lib/session";

export const Route = createFileRoute("/_layout/_crosspost")({
  beforeLoad: ({ context }) => {
    const session = context.session as SessionData | null | undefined;
    const auth = getSessionFromData(session);
    return { isSignedIn: auth.isAuthenticated };
  },
  component: CrosspostLayout,
});

function CrosspostLayout() {
  const { isSignedIn } = Route.useRouteContext();

  if (!isSignedIn) {
    return <LandingPage />;
  }

  return <Outlet />;
}
