import { Megaphone, X } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { useIsClient } from "@/hooks/use-client";
import { cn } from "@/lib/utils";
import { Popover, PopoverAnchor, PopoverContent } from "./ui/popover";

const seenKey = (userId: string) => `crosspost:campaigns-tour-seen:${userId}`;
const PENDING_KEY = "crosspost:campaigns-tour-pending";
const AUTO_HIDE_MS = 4000;

export function markCampaignsTourForNewUser(userId: string) {
  if (typeof window === "undefined" || !userId) {
    return;
  }
  if (localStorage.getItem(seenKey(userId)) === "1") {
    return;
  }
  sessionStorage.setItem(PENDING_KEY, userId);
}

type CampaignsTourProps = {
  userId: string;
  children: ReactNode;
};

export function CampaignsTour({ userId, children }: CampaignsTourProps) {
  const isClient = useIsClient();
  const [open, setOpen] = useState(false);

  const dismiss = useCallback(() => {
    if (userId) {
      localStorage.setItem(seenKey(userId), "1");
      if (sessionStorage.getItem(PENDING_KEY) === userId) {
        sessionStorage.removeItem(PENDING_KEY);
      }
    }
    setOpen(false);
  }, [userId]);

  useEffect(() => {
    if (!isClient || !userId) {
      return;
    }

    const alreadySeen = localStorage.getItem(seenKey(userId)) === "1";
    if (alreadySeen) {
      return;
    }

    const showTimer = window.setTimeout(() => setOpen(true), 450);
    return () => window.clearTimeout(showTimer);
  }, [userId, isClient]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const hideTimer = window.setTimeout(() => dismiss(), AUTO_HIDE_MS);
    return () => window.clearTimeout(hideTimer);
  }, [open, dismiss]);

  return (
    <Popover open={open} onOpenChange={(next) => next && setOpen(true)}>
      <PopoverAnchor asChild>
        <div
          className={cn(
            "inline-flex rounded-sm transition-shadow",
            open && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          )}
        >
          {children}
        </div>
      </PopoverAnchor>
      <PopoverContent
        side="bottom"
        align="center"
        sideOffset={14}
        collisionPadding={12}
        className="w-[min(20rem,calc(100vw-1.5rem))] overflow-visible rounded-md border-2 border-primary bg-background p-0 text-foreground shadow-[4px_4px_0_0_rgb(0,0,0)] dark:shadow-[4px_4px_0_0_rgba(255,255,255,0.3)]"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <div className="relative px-4 pb-4 pt-4">
          <span
            aria-hidden
            className="pointer-events-none absolute -top-[7px] left-1/2 h-3.5 w-3.5 -translate-x-1/2 rotate-45 border-l-2 border-t-2 border-primary bg-background"
          />
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Megaphone className="h-4 w-4 shrink-0" aria-hidden />
              <p className="text-sm font-bold leading-tight">OpenCrosspost Campaigns</p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="-mr-1 -mt-1 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 space-y-1 text-sm leading-snug text-muted-foreground">
            <p>Start here</p>
            <p>join campaigns like GM and post from your connected accounts</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
