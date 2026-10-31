import { useQuery } from "@tanstack/react-query";
import type { ClientRuntimeConfig } from "everything-dev/types";
import { startVersionWatch } from "everything-dev/ui/version-check";
import { useEffect, useState } from "react";
import { sessionQueryOptions, useAuthClient } from "@/app";
import { Button } from "@/components/ui/button";

const VERSION_DISMISSED_KEY = "version-refresh-dismissed";

export function VersionRefreshBanner({
  runtimeConfig,
}: {
  runtimeConfig?: Partial<ClientRuntimeConfig>;
}) {
  const authClient = useAuthClient();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(
    () =>
      typeof window !== "undefined" && window.sessionStorage.getItem(VERSION_DISMISSED_KEY) === "1",
  );
  const { data: session } = useQuery(sessionQueryOptions(authClient));

  useEffect(() => {
    const fingerprint = runtimeConfig?.deploymentFingerprint;
    if (!fingerprint || dismissed || !session?.user) {
      return;
    }

    const handle = startVersionWatch({
      currentFingerprint: fingerprint,
      onNewVersion: () => setShow(true),
    });

    return () => handle.stop();
  }, [runtimeConfig?.deploymentFingerprint, dismissed, session?.user]);

  if (!show || dismissed) {
    return null;
  }

  return (
    <div
      data-testid="version-refresh-banner"
      className="safe-area-inset-bottom fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-3 border-t border-border bg-background px-4 py-3 text-sm text-foreground shadow-custom"
      role="status"
    >
      <span>A new version is available.</span>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setDismissed(true)}>
          Dismiss
        </Button>
        <Button
          size="sm"
          onClick={() => {
            window.sessionStorage.setItem(VERSION_DISMISSED_KEY, "1");
            window.location.reload();
          }}
        >
          Refresh
        </Button>
      </div>
    </div>
  );
}
