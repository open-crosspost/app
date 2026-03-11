import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import {
  sessionQueryOptions,
  organizationsQueryOptions,
  getSessionFromData,
  type SessionData,
} from "@/lib/session";

// Auth context provided to child routes
export interface AuthContext {
  isAuthenticated: boolean;
  user: SessionData["user"] | null;
  session: SessionData["session"] | null;
  activeOrganizationId: string | null;
  isAnonymous: boolean;
  isAdmin: boolean;
  isBanned: boolean;
}

export const Route = createFileRoute("/_layout/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    const { queryClient } = context;

    // Get session from cache or fetch
    const session = await queryClient.ensureQueryData(
      sessionQueryOptions((context as unknown as Record<string, unknown>).session as SessionData | undefined | null)
    );

    const auth = getSessionFromData(session);

    if (!auth.isAuthenticated) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }

    if (auth.isBanned) {
      // Redirect banned users to login with error info in hash
      throw redirect({
        to: "/login",
        hash: "banned",
      });
    }

    // Preload organizations for authenticated users
    await queryClient.ensureQueryData(
      organizationsQueryOptions()
    );

    return {
      auth,
      session,
    };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <div className="min-h-screen">
      <Outlet />
    </div>
  );
}
