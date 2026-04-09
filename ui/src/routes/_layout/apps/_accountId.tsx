import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/apps/_accountId")({
  component: AccountLayout,
});

function AccountLayout() {
  return <Outlet />;
}
