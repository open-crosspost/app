import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_layout/_authenticated/_admin")({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();

    // Check if user has admin role using Better Auth's role system
    const user = session?.user as { role?: string; banned?: boolean };

    if (!session?.user) {
      toast.error("Must be signed in", { id: "auth-required" });
      throw redirect({ to: "/login" });
    }

    if (user.banned) {
      toast.error("Account is banned", { id: "account-banned" });
      throw redirect({ to: "/" });
    }

    if (user.role !== "admin") {
      toast.error("Must be admin to visit this page", { id: "admin-role-required" });
      throw redirect({
        to: "/",
      });
    }

    return { session };
  },
  component: () => <Outlet />,
});
