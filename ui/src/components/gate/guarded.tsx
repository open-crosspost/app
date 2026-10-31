import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type GuardedProps = {
  guarded: boolean;
  onExplain?: () => void;
  explainLabel?: string;
  children: ReactNode;
  className?: string;
};

/**
 * Wraps a gated panel: red dashed border, dimmed content, an opaque overlay,
 * and a lock badge with a button that explains the guard. Untouched when
 * `guarded` is false.
 */
export function Guarded({
  guarded,
  onExplain,
  explainLabel = "Why is this gated?",
  children,
  className,
}: GuardedProps) {
  if (!guarded) {
    return <div className={className}>{children}</div>;
  }
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border-2 border-dashed border-destructive/70",
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none select-none opacity-50">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 p-4 text-center">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-destructive/40 bg-destructive/10">
          <Lock className="h-3.5 w-3.5 text-destructive" />
        </span>
        {onExplain ? (
          <Button variant="outline" size="sm" onClick={onExplain}>
            {explainLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
