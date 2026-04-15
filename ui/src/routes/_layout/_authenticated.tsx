import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSessionFromData, type SessionData, sessionQueryOptions } from "@/lib/session";

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

    const session = await queryClient.ensureQueryData(
      sessionQueryOptions(context.session as SessionData | undefined | null),
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
      throw redirect({
        to: "/login",
        hash: "banned",
      });
    }

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
