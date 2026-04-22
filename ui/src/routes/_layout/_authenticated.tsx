import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSessionFromData, type SessionData } from "@/lib/session";

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
  beforeLoad: ({ context, location }) => {
    const session = context.session as SessionData | null | undefined;
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
