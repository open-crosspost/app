import { ClientOnly, createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Footer } from "@/components/footer";
import { Buddy } from "@/components/pet/buddy";
import { RoutePending } from "@/components/route-pending";
import { useScheduledPostsExecutor } from "@/hooks/use-scheduled-posts-executor";
import { requireSession } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: requireSession,
  pendingComponent: RoutePending,
  pendingMs: 100,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  useScheduledPostsExecutor();

  return (
    <AppShell footer={<Footer />}>
      <Outlet />
      <ClientOnly>
        <Buddy />
      </ClientOnly>
    </AppShell>
  );
}
