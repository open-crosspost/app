import type { PlatformName } from "@crosspost/plugin/types";
import { Calendar, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuthClient } from "@/app";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EditorContent } from "@/store/drafts-store";
import { useScheduledPostsStore } from "@/store/scheduled-posts-store";

interface SchedulePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  posts: EditorContent[];
  selectedPlatforms: PlatformName[];
  onScheduled: () => void;
}

const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function SchedulePostModal({
  isOpen,
  onClose,
  posts,
  selectedPlatforms,
  onScheduled,
}: SchedulePostModalProps) {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const { saveScheduledPost } = useScheduledPostsStore();
  const { data: session } = useAuthClient().useSession();
  const isSignedIn = !!session?.user;

  const handleSchedule = () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Missing Information", {
        description: "Please select both date and time for scheduling.",
      });
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast.error("No Platforms Selected", {
        description: "Please select at least one platform to post to.",
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

    saveScheduledPost(posts, selectedPlatforms, scheduledDateTime);

    toast.success("Post Scheduled", {
      description: `Scheduled for ${scheduledDateTime.toLocaleString()} (${userTimeZone}). It fires while the app is open.`,
    });

    onScheduled();
    onClose();
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
            Times are local ({userTimeZone}). Posts fire while the app is open.
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
            onClick={handleSchedule}
            className="flex-1"
            disabled={!selectedDate || !selectedTime || selectedPlatforms.length === 0}
          >
            Schedule Post
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
