import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useApiClient } from "@/app";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAutomationKey } from "@/hooks/use-automation-key";
import { jobRunsQueryKey, jobSpecsQueryKey, jobTargetsFromAccounts } from "@/lib/social";

type AccountOption = {
  platform: string;
  userId: string;
  username?: string;
};

type AutomateDialogProps = {
  campaignId: string | undefined;
  campaignName: string;
  accounts: AccountOption[];
  onClose: () => void;
};

export function AutomateDialog({
  campaignId,
  campaignName,
  accounts,
  onClose,
}: AutomateDialogProps) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    accounts.slice(0, 1).map((account) => account.userId),
  );
  const [dailyTime, setDailyTime] = useState<string>("");

  const hasNearTarget = selectedIds.some((userId) =>
    accounts.some((account) => account.userId === userId && account.platform === "Near Social"),
  );

  const automationKey = useAutomationKey(hasNearTarget && !!campaignId);
  const keyStatus = automationKey.status.data;
  const keyGranted = keyStatus?.status === "active";

  const enroll = useMutation({
    mutationFn: async () => {
      const selectedAccounts = accounts.filter((account) => selectedIds.includes(account.userId));
      const targets = jobTargetsFromAccounts(selectedAccounts);
      if (!campaignId || targets.length === 0) {
        throw new Error("Select at least one profile to automate.");
      }

      const schedule: { mode: "daily"; at?: string; tz?: string } = { mode: "daily" };
      if (dailyTime) {
        schedule.at = dailyTime;
        schedule.tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      }

      await apiClient.social.jobs.specs.create({
        kind: "campaign",
        campaignId,
        targets,
        schedule,
      });
      await apiClient.social.campaigns.participate({ campaignId, mode: "auto" });
    },
    onSuccess: () => {
      toast.success("Automation created", {
        description: "Your gm posts daily in reply to the campaign seed.",
      });
      void queryClient.invalidateQueries({ queryKey: jobSpecsQueryKey });
      void queryClient.invalidateQueries({ queryKey: jobRunsQueryKey() });
      void queryClient.invalidateQueries({ queryKey: ["social", "participations"] });
      onClose();
    },
    onError: (error) => {
      toast.error("Could not create the automation", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const toggle = (userId: string) =>
    setSelectedIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );

  const nearTargetsSelected = hasNearTarget;
  const needsKey = nearTargetsSelected && !keyGranted;
  const loadingGrant = automationKey.grant.isPending;
  const canEnroll = selectedIds.length > 0 && !needsKey && !enroll.isPending;

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="border-2 border-primary bg-popover sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Automate “{campaignName}”</DialogTitle>
          <DialogDescription>
            The app posts the campaign for you each day, in reply to that day's seed. Fires shortly
            after the seed lands{dailyTime ? " (or at your daily time)" : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No connected profiles yet — connect a platform first.
              </p>
            ) : (
              accounts.map((account) => (
                <label
                  key={account.userId}
                  className="flex cursor-pointer items-center gap-2 rounded border border-border p-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(account.userId)}
                    onChange={() => toggle(account.userId)}
                    className="h-4 w-4"
                  />
                  <span className="min-w-0 truncate">
                    {account.username || account.userId}{" "}
                    <span className="text-muted-foreground">({account.platform})</span>
                  </span>
                </label>
              ))
            )}
          </div>

          <div>
            <label htmlFor="automate-daily-time" className="mb-1 block text-sm font-medium">
              Daily time (optional)
            </label>
            <input
              id="automate-daily-time"
              type="time"
              value={dailyTime}
              onChange={(event) => setDailyTime(event.target.value)}
              className="w-full rounded border-2 border-primary bg-background p-2"
            />
          </div>

          {nearTargetsSelected && keyStatus && keyStatus.status !== "active" ? (
            <div className="rounded border border-border bg-background p-3 text-sm">
              <p className="font-medium">
                NEAR Social automation needs a posted-on-your-behalf key
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                A wallet approval adds a function-call key scoped to social posts only (no token
                access). The app pays the gas. Revoke anytime.
              </p>
            </div>
          ) : null}

          {keyGranted ? (
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck size={12} />
              Key active ({keyStatus?.publicKey?.slice(0, 18)}…)
            </Badge>
          ) : null}
        </div>

        <div className="flex gap-2">
          <Button onClick={onClose} className="flex-1">
            Cancel
          </Button>
          {needsKey ? (
            <Button
              onClick={() => automationKey.grant.mutate()}
              className="flex-1"
              disabled={loadingGrant}
            >
              {loadingGrant ? <Loader2 size={16} className="animate-spin" /> : null}
              {loadingGrant ? "Add key…" : "Add automation key"}
            </Button>
          ) : (
            <Button onClick={() => enroll.mutate()} className="flex-1" disabled={!canEnroll}>
              {enroll.isPending ? "Creating…" : "Create automation"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
