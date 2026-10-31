import { useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useApiClient, useAuthClient } from "@/app";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { jobRunsQueryKey, jobSpecsQueryKey, jobTargetsFromAccounts } from "@/lib/social";
import type { EditorContent } from "@/store/drafts-store";

interface ScheduleTargetAccount {
  platform: string;
  userId: string;
  username?: string;
}

interface SchedulePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  posts: EditorContent[];
  selectedAccounts: ScheduleTargetAccount[];
  onScheduled: () => void;
}

const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function SchedulePostModal({
  isOpen,
  onClose,
  posts,
  selectedAccounts,
  onScheduled,
}: SchedulePostModalProps) {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const { data: session } = useAuthClient().useSession();
  const isSignedIn = !!session?.user;

  const handleSchedule = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Missing Information", {
        description: "Please select both date and time for scheduling.",
      });
      return;
    }

    if (selectedAccounts.length === 0) {
      toast.error("No Profiles Selected", {
        description: "Please select at least one profile to post to.",
      });
      return;
    }

    if (!isSignedIn) {
      toast.error("Authentication Required", {
        description: "Please sign in before scheduling posts.",
      });
      return;
    }

    const scheduledDateTime = new Date(`${selectedDate}T${selectedTime}`);
    if (scheduledDateTime <= new Date()) {
      toast.error("Invalid Date", { description: "Please select a future date and time." });
      return;
    }

    setIsScheduling(true);
    try {
      await apiClient.social.jobs.specs.create({
        kind: "scheduled",
        posts: posts.map((post) => ({
          text: post.text ?? "",
          media: (post.media ?? []).map((item) => ({
            data: typeof item.data === "string" ? item.data : "",
            mimeType: item.mimeType,
            altText: item.altText,
          })),
        })),
        targets: jobTargetsFromAccounts(selectedAccounts),
        schedule: { mode: "once", at: scheduledDateTime.toISOString() },
      });

      toast.success("Post Scheduled", {
        description: `Scheduled for ${scheduledDateTime.toLocaleString()} (${userTimeZone}). It fires while the app is open; server execution is coming next.`,
      });

      await queryClient.invalidateQueries({ queryKey: jobSpecsQueryKey });
      await queryClient.invalidateQueries({ queryKey: jobRunsQueryKey() });

      onScheduled();
      onClose();
    } catch (error) {
      toast.error("Scheduling Failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsScheduling(false);
    }
  };

  const now = new Date();
  const currentDate = now.toISOString().split("T")[0];
  const currentTime = now.toTimeString().slice(0, 5);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="border-2 border-primary bg-popover shadow-custom sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar size={20} />
            Schedule Post
          </DialogTitle>
          <DialogDescription>
            Times are local ({userTimeZone}). Publishing happens on {selectedAccounts.length}{" "}
            selected profile{selectedAccounts.length === 1 ? "" : "s"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label htmlFor="schedule-date" className="mb-2 block text-sm font-medium">
              Date
            </label>
            <input
              id="schedule-date"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              min={currentDate}
              className="w-full rounded border-2 border-primary bg-background p-2 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label htmlFor="schedule-time" className="mb-2 block text-sm font-medium">
              Time
            </label>
            <input
              id="schedule-time"
              type="time"
              value={selectedTime}
              onChange={(event) => setSelectedTime(event.target.value)}
              min={selectedDate === currentDate ? currentTime : undefined}
              className="w-full rounded border-2 border-primary bg-background p-2 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {selectedDate && selectedTime ? (
            <div className="flex items-center gap-2 rounded bg-muted p-3 text-sm text-muted-foreground">
              <Clock size={16} className="shrink-0" />
              Scheduled for: {new Date(`${selectedDate}T${selectedTime}`).toLocaleString()}
            </div>
          ) : null}
        </div>

        <div className="flex gap-2">
          <Button onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={() => void handleSchedule()}
            className="flex-1"
            disabled={
              !selectedDate || !selectedTime || selectedAccounts.length === 0 || isScheduling
            }
          >
            {isScheduling ? "Scheduling…" : "Schedule Post"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
