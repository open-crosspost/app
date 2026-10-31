import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { pluginHref, sessionQueryOptions, useAuthClient } from "@/app";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "crosspost:anonymous-nudge-dismissed";

/**
 * A persistent-but-dismissable nudge for anonymous (guest) sessions: drafts
 * and scheduled posts live in this browser only, and signing in keeps them
 * with the account while unlocking sponsored posting.
 */
export function AnonymousBanner() {
  const authClient = useAuthClient();
  const { data: session } = useQuery(sessionQueryOptions(authClient));
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (session?.user?.isAnonymous !== true || dismissed) {
    return null;
  }

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-md border border-primary/40 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">
          You're posting as a guest — drafts and schedules live in this browser only.{" "}
          <span className="text-foreground">Sign in to keep them with your account</span> and unlock
          sponsored posting.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:self-center">
        <Button asChild size="sm">
          <Link to={pluginHref("/login", { redirect: window.location.pathname })}>Sign in</Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Dismiss"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "1");
            setDismissed(true);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
