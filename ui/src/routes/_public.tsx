import { createFileRoute, Outlet } from "@tanstack/react-router";
import { sessionQueryOptions } from "@/app";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

export const Route = createFileRoute("/_public")({
  beforeLoad: async ({ context }) => {
    const { queryClient } = context;
    const session = await queryClient.ensureQueryData(
      sessionQueryOptions(context.authClient, context.session),
    );
    return { session };
  },
  component: LayoutComponent,
});

function LayoutComponent() {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
    </>
  );
}
