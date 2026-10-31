import { useMutation } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { Amount } from "near-kit";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { useAuthClient } from "@/app";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NETWORK_ID } from "@/config";

const PRESETS = ["1", "5", "10"];

type FundDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  target: string | null;
  explorerPath?: string;
};

/**
 * Sends NEAR from the admin's own connected wallet (near-kit via
 * authClient.near) to `target` — the dashboard holds no keys and never
 * touches the sponsor's funds.
 */
export function FundDialog({
  open,
  onOpenChange,
  title,
  description,
  target,
  explorerPath = "address",
}: FundDialogProps) {
  const authClient = useAuthClient();
  const [amount, setAmount] = useState("5");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!target) throw new Error("No funding target configured yet.");
      const near = authClient.near.getNearClient(NETWORK_ID);
      const outcome = await near.send(target, Amount.NEAR(Number(amount)));
      return outcome.transaction?.hash ?? null;
    },
    onSuccess: (txHash) => {
      toast.success(`Sent ${amount} NEAR`, {
        description: txHash ? `Transaction ${txHash.slice(0, 12)}… is on its way.` : undefined,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Transfer failed", { description: error.message });
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border bg-background text-foreground">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="fund-amount">Amount (NEAR)</Label>
            <div className="flex gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={amount === preset ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAmount(preset)}
                >
                  {preset}
                </Button>
              ))}
            </div>
            <Input
              id="fund-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={mutation.isPending}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Signed by your connected wallet{" "}
            <span className="font-mono">{target ? `→ ${target}` : "— target unknown"}</span>
          </p>
          <DialogFooter>
            {target ? (
              <Button asChild variant="ghost" size="sm">
                <a
                  href={`https://nearblocks.io/${explorerPath}/${target}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View on explorer
                </a>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || !target}>
              {mutation.isPending ? "Sending…" : `Send ${amount} NEAR`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
