import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import type { SessionData } from "@/lib/session";

// Simple auth context for use within the route tree
interface RouteAuthContext {
  auth: {
    isAuthenticated: boolean;
    isAdmin: boolean;
    isBanned: boolean;
    user: SessionData["user"] | null;
  };
  session: SessionData;
}

export const Route = createFileRoute("/_layout/_authenticated/_admin")({
  beforeLoad: async ({ context }) => {
    const routeContext = context as unknown as RouteAuthContext;
    const { auth } = routeContext;

    // Read from parent authenticated context instead of refetching
    if (!auth?.isAuthenticated) {
      throw redirect({ to: "/login" });
    }

    if (auth.isBanned) {
      throw redirect({ to: "/login", hash: "banned" });
    }

    if (!auth.isAdmin) {
      // Redirect to unauthorized page instead of silently bouncing to root
      throw redirect({ to: "/", hash: "unauthorized" });
    }

    return { auth };
  },
  component: () => <Outlet />,
});
