import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type NearSocialFallbackChoice = "direct" | "skip";

type NearSocialFallbackDialogProps = {
  reason: string | null;
  onChoice: (choice: NearSocialFallbackChoice) => void;
};

export function NearSocialFallbackDialog({ reason, onChoice }: NearSocialFallbackDialogProps) {
  return (
    <Dialog
      open={reason !== null}
      onOpenChange={(open) => {
        if (!open) onChoice("skip");
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Post directly from your wallet?</DialogTitle>
          <DialogDescription>
            {reason} You can still post to NEAR Social directly from your wallet — you'll pay a
            small gas fee instead.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onChoice("skip")}>
            Skip NEAR Social
          </Button>
          <Button onClick={() => onChoice("direct")}>Post directly</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
