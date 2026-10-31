import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/_dashboard")({
  component: AdminShell,
});

function AdminShell() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
      <Outlet />
    </div>
  );
}
