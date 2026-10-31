import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { GuardExplanation } from "@/components/gate/guard-popover";
import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { isGateBlocked, useXpostGate } from "@/hooks/use-xpost-gate";
import { XPOST_BUY_URL } from "@/lib/gate";

type XpostGateCardProps = {
  redirectPath: string;
};

/**
 * The Manage-page XPOST tier status: current tier, balance vs. the Tier-1
 * minimum, and the remedy when the caller is below the gate.
 */
export function XpostGateCard({ redirectPath }: XpostGateCardProps) {
  const { data: status, isLoading } = useXpostGate();
  const [open, setOpen] = useState(false);

  if (isLoading || !status?.enabled) {
    return null;
  }

  const blocked = isGateBlocked(status);
  const tier = status.caller.tier ?? 0;

  if (!blocked) {
    return (
      <div className="rounded-md border bg-card p-4 text-card-foreground">
        <p className="text-sm font-medium">Sponsored posting: XPOST Tier {tier} of 3</p>
        <p className="mt-1 text-sm text-muted-foreground">
          You hold {status.caller.balance ?? "0"} $XPOST — posting on the app's key is metered per
          post, no keys or deposits needed.
        </p>
      </div>
    );
  }

  const reason = status.caller.nearAccountId == null ? "no_near_account" : "balance_too_low";

  return (
    <div className="rounded-md border-2 border-dashed border-destructive/70 bg-card p-4 text-card-foreground">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div>
            <p className="text-sm font-medium">Sponsored posting: below Tier 1</p>
            <p className="mt-1 text-sm text-muted-foreground">
              App-paid X posting needs at least {status.tier1} $XPOST
              {status.caller.balance ? ` — you hold ${status.caller.balance}` : ""}.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setOpen(true)}>
              How do I unlock this?
            </Button>
          </div>
        </PopoverAnchor>
        <PopoverContent
          side="top"
          align="start"
          sideOffset={10}
          collisionPadding={12}
          className="w-[min(22rem,calc(100vw-1.5rem))] border-2 border-destructive/60 bg-background"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <GuardExplanation
            reason={reason}
            minimum={status.tier1}
            balance={status.caller.balance}
            buyUrl={XPOST_BUY_URL}
            redirectPath={redirectPath}
          />
        </PopoverContent>
      </Popover>
      <Button asChild size="sm" variant="ghost" className="mt-2">
        <a href={XPOST_BUY_URL} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-3.5 w-3.5" />
          Buy $XPOST
        </a>
      </Button>
    </div>
  );
}
