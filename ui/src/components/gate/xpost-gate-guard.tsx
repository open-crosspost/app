import { Info, ShieldAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GuardExplanation } from "@/components/gate/guard-popover";
import { Guarded } from "@/components/gate/guarded";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSponsorStats } from "@/hooks/use-sponsor";
import { isGateBlocked, useXpostGate } from "@/hooks/use-xpost-gate";
import { XPOST_BUY_URL, XPOST_GUARD_ANCHOR_ID } from "@/lib/gate";
import { formatMicrosUsd } from "@/lib/sponsor";
import { cn } from "@/lib/utils";
import { SPONSORED_POSTING_TIP, useBuddyTipStore } from "@/store/buddy-tip-store";
import { useGateStore } from "@/store/gate-store";

type XpostGateGuardProps = {
  redirectPath: string;
};

/**
 * The editor's sponsored-posting guard: when the XPOST gate blocks app-paid
 * dispatch, the panel renders gated (red dashed border + opaque overlay) and
 * a popover explains the remedy. A submit-time GATE_REFUSED refusal scrolls
 * here, highlights the panel, and opens the popover.
 */
export function XpostGateGuard({ redirectPath }: XpostGateGuardProps) {
  const { data: status, isLoading } = useXpostGate();
  const { data: sponsorStats } = useSponsorStats();
  const refusal = useGateStore((state) =>
    state.refusal?.anchorId === XPOST_GUARD_ANCHOR_ID ? state.refusal : null,
  );
  const highlightedAt = useGateStore((state) =>
    state.refusal?.anchorId === XPOST_GUARD_ANCHOR_ID ? state.highlightedAt : 0,
  );
  const clearRefusal = useGateStore((state) => state.clearRefusal);
  const showBuddyTip = useBuddyTipStore((state) => state.showTip);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const blocked = isGateBlocked(status);

  useEffect(() => {
    if (highlightedAt === 0) return;
    anchorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setOpen(true);
  }, [highlightedAt]);

  useEffect(() => {
    if (sponsorStats && sponsorStats.sponsoredPosts > 0) {
      showBuddyTip(SPONSORED_POSTING_TIP);
    }
  }, [sponsorStats, showBuddyTip]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      clearRefusal();
    }
  };

  const hasSponsorHistory = (sponsorStats?.sponsoredPosts ?? 0) > 0;

  if (isLoading || (!blocked && !refusal && !hasSponsorHistory)) {
    return null;
  }

  const reason =
    refusal?.reason ??
    (status?.caller.nearAccountId == null ? "no_near_account" : "balance_too_low");
  const minimum = status?.tier1 ?? refusal?.minimum ?? "";
  const balance = status?.caller.balance ?? refusal?.balance ?? null;
  const buyUrl = refusal?.buyUrl ?? XPOST_BUY_URL;

  return (
    <div
      id={XPOST_GUARD_ANCHOR_ID}
      ref={anchorRef}
      className={cn(
        "scroll-mt-24 rounded-md transition-shadow",
        highlightedAt > 0 && "ring-2 ring-destructive ring-offset-2 ring-offset-background",
      )}
    >
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverAnchor asChild>
          <div className="rounded-md bg-card text-card-foreground">
            <Guarded guarded={blocked} onExplain={() => setOpen(true)}>
              <div className="flex items-start gap-2 border border-border p-3 sm:p-4">
                <ShieldAlert
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div className="min-w-0 space-y-1">
                  {blocked || refusal ? (
                    <>
                      <p className="text-sm font-medium">Sponsored posting on the app's key</p>
                      <p className="text-sm text-muted-foreground">
                        Your connected X accounts publish through the app's paid OutLayer key — no
                        keys, no deposits, metered per post.
                      </p>
                      {sponsorStats && sponsorStats.sponsoredPosts > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          So far the app has sponsored {sponsorStats.sponsoredPosts} post
                          {sponsorStats.sponsoredPosts === 1 ? "" : "s"} for ≈
                          {formatMicrosUsd(sponsorStats.sponsoredUsdMicros)} of compute.
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs text-muted-foreground">Sponsored posting</p>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            aria-label="About sponsored posting and billing"
                            className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <Info className="h-3 w-3" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-80">
                          <div className="space-y-2">
                            <p className="text-sm font-medium">
                              Sponsored posting on the app's key
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Your connected X accounts publish through the app's paid OutLayer key
                              — no keys, no deposits, metered per post.
                            </p>
                            {sponsorStats && sponsorStats.sponsoredPosts > 0 ? (
                              <p className="text-xs text-muted-foreground">
                                So far the app has sponsored {sponsorStats.sponsoredPosts} post
                                {sponsorStats.sponsoredPosts === 1 ? "" : "s"} for ≈
                                {formatMicrosUsd(sponsorStats.sponsoredUsdMicros)} of compute.
                              </p>
                            ) : null}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
              </div>
            </Guarded>
          </div>
        </PopoverAnchor>
        <PopoverContent
          side="bottom"
          align="start"
          sideOffset={10}
          collisionPadding={12}
          className="w-[min(22rem,calc(100vw-1.5rem))] border-2 border-destructive/60 bg-background"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <GuardExplanation
            reason={reason}
            minimum={minimum}
            balance={balance}
            buyUrl={buyUrl}
            redirectPath={redirectPath}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
