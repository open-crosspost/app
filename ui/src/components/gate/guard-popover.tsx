import { Link } from "@tanstack/react-router";
import { ExternalLink, LogIn, Wallet } from "lucide-react";
import { pluginHref } from "@/app";
import { Button } from "@/components/ui/button";
import type { GateRefusalData } from "@/lib/gate";

type GuardExplanationProps = {
  reason: GateRefusalData["reason"];
  minimum: string;
  balance: string | null;
  buyUrl: string;
  redirectPath: string;
};

/**
 * The body of a gate-explaining popover: why the guard fired and what clears
 * it — buy $XPOST, sign in with NEAR, or bring your own OutLayer wallet.
 */
export function GuardExplanation({
  reason,
  minimum,
  balance,
  buyUrl,
  redirectPath,
}: GuardExplanationProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold leading-tight">
          {reason === "no_near_account"
            ? "Sponsored posting needs a NEAR account"
            : "Sponsored posting needs more $XPOST"}
        </p>
        <p className="text-sm leading-snug text-muted-foreground">
          {reason === "no_near_account"
            ? `Sign in with your NEAR wallet to post on the app's key. Free NEAR Social posting still works without it.`
            : `Posting on the app's key requires holding at least ${minimum} $XPOST${
                balance ? ` — you hold ${balance}` : ""
              }. Free NEAR Social posting still works without it.`}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {reason === "no_near_account" ? (
          <Button asChild size="sm">
            <Link to={pluginHref("/login", { redirect: redirectPath })}>
              <LogIn className="h-3.5 w-3.5" />
              Sign in
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm">
            <a href={buyUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Buy $XPOST
            </a>
          </Button>
        )}
        <Button asChild size="sm" variant="outline">
          <Link to="/manage">
            <Wallet className="h-3.5 w-3.5" />
            Use your own wallet
          </Link>
        </Button>
      </div>
    </div>
  );
}
