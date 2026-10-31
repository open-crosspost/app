import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Post-login fallback target — some composed login flows default here.
 * Signed-in users continue into the app; everyone else goes to sign-in.
 */
export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/editor" });
  },
});
