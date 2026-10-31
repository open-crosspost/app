import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";

/**
 * Route-level pending state — renders the real shell with a spinner so
 * guarded navigations don't fall back to a blank screen or bare text.
 */
export function RoutePending() {
  return (
    <AppShell>
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    </AppShell>
  );
}
