import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/_dashboard/admin")({
  head: ({ match }) => {
    const runtimeConfig = match.context?.runtimeConfig;
    const title = runtimeConfig?.runtime?.title ?? "Admin";
    return { meta: [{ title: `Admin · ${title}` }] };
  },
  component: AdminLayout,
});

function AdminLayout() {
  return <Outlet />;
}
