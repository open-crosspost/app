import { createFileRoute, Outlet } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { sessionQueryOptions } from "@/app";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

export const Route = createFileRoute("/_layout")({
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
      <div className="relative min-h-screen overflow-x-clip p-2 pb-3 pr-3 sm:p-4 sm:pb-5 sm:pr-5">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mx-auto min-h-[calc(100vh-1rem)] w-full max-w-full border-2 border-primary bg-background shadow-[4px_4px_0_rgba(0,0,0,1)] dark:shadow-[4px_4px_0_rgba(255,255,255,0.3)]"
        >
          <Header />
          <div className="min-w-0 p-3 sm:p-4 md:p-8">
            <Outlet />
          </div>
        </motion.div>
      </div>
      <Footer />
    </>
  );
}
