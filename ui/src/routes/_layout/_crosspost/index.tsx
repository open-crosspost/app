import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ManageAccountsButton } from "@/components/manage-accounts-button";
import { authClient } from "@/lib/auth-client";
import { getNearWalletDisplayFromSession } from "@/lib/near-session-display";

export const Route = createFileRoute("/_layout/_crosspost/")({
  component: CrosspostHomePage,
});

function CrosspostHomePage() {
  const { data: session } = authClient.useSession();
  const walletDisplay = getNearWalletDisplayFromSession(session);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-4 flex items-center justify-center">
          <div className="mr-2 h-3 w-3 rounded-full bg-green-500" />
          <p className="text-sm font-medium text-green-600">
            {walletDisplay ? `Connected as @${walletDisplay}` : "Connected"}
          </p>
        </div>

        <h1 className="mb-4 text-3xl font-bold">Connect Your Accounts</h1>
        <p className="mb-8 max-w-md text-muted-foreground">
          Connect your social media accounts to start crossposting.
        </p>

        <div className="flex flex-col space-y-4">
          <ManageAccountsButton />
        </div>
      </motion.div>
    </div>
  );
}
