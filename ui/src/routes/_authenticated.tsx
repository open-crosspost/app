import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useScheduledPostsExecutor } from "@/hooks/use-scheduled-posts-executor";
import { requireSession } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: requireSession,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  useScheduledPostsExecutor();

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
