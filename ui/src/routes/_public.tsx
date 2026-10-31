import { ClientOnly, createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { sessionQueryOptions } from "@/app";
import { AppShell } from "@/components/app-shell";
import { Footer } from "@/components/footer";
import { Buddy } from "@/components/pet/buddy";

export const Route = createFileRoute("/_public")({
  beforeLoad: async ({ context }) => {
    const { queryClient } = context;
    const session = await queryClient.ensureQueryData(sessionQueryOptions(context.authClient));
    return { session };
  },
  component: LayoutComponent,
});

const FOCUSED_PREFIXES = ["/login", "/onboard"];

export function isFocusedPublicPath(pathname: string) {
  return FOCUSED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function LayoutComponent() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const focused = isFocusedPublicPath(pathname);

  return (
    <AppShell focused={focused} footer={focused ? undefined : <Footer />}>
      <Outlet />
      <ClientOnly>
        <Buddy />
      </ClientOnly>
    </AppShell>
  );
}
