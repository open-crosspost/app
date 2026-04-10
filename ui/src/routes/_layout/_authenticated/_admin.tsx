import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/_authenticated/_admin")({
  beforeLoad: async ({ context }) => {
    const { auth } = context;

    if (!auth?.isAuthenticated) {
      throw redirect({ to: "/login" });
    }

    if (auth.isBanned) {
      throw redirect({ to: "/login", hash: "banned" });
    }

    if (!auth.isAdmin) {
      throw redirect({ to: "/", hash: "unauthorized" });
    }

    return { auth };
  },
  component: () => <Outlet />,
});
