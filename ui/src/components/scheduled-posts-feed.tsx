import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Play,
  Trash2,
  XCircle,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useApiClient } from "@/app";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { jobRunsQueryKey, jobSpecsQueryKey } from "@/lib/social";

type RunStatus = "pending" | "executing" | "completed" | "failed" | "needs_signature" | "cancelled";
type RunsFilter = Parameters<typeof jobRunsQueryKey>[0];
type SpecStatus = "active" | "paused" | "cancelled";

type JobSpecDto = {
  id: string;
  kind: "scheduled" | "campaign";
  campaignId: string | null;
  posts: Array<{ text?: string; media?: unknown[] }> | null;
  targets: Array<{ platform: string; accountUserId: string }>;
  schedule: { mode: "once"; at: string } | { mode: "daily"; at?: string; tz?: string };
  status: SpecStatus;
};

type JobRunDto = {
  id: string;
  specId: string;
  kind: "scheduled" | "campaign";
  campaignId: string | null;
  scheduledFor: string;
  status: RunStatus;
  error: string | null;
  executedAt: string | null;
};

const StatusIcon: React.FC<{ status: RunStatus }> = ({ status }) => {
  switch (status) {
    case "pending":
      return <Clock size={16} className="text-primary" />;
    case "executing":
      return <Play size={16} className="text-warning" />;
    case "completed":
      return <CheckCircle2 size={16} className="text-success" />;
    case "failed":
      return <XCircle size={16} className="text-destructive" />;
    default:
      return <AlertCircle size={16} className="text-muted-foreground" />;
  }
};

const StatusBadge: React.FC<{ status: RunStatus }> = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case "pending":
        return "bg-primary/10 text-primary";
      case "executing":
        return "bg-warning/15 text-warning";
      case "completed":
        return "bg-success/10 text-success";
      case "failed":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-foreground";
    }
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

type FeedItem = {
  run: JobRunDto;
  spec: JobSpecDto | undefined;
};

function FeedListItem({ item, onDelete }: { item: FeedItem; onDelete: (specId: string) => void }) {
  const { run, spec } = item;
  const preview =
    spec?.posts?.[0]?.text?.trim() || (run.campaignId ? `gm (${run.campaignId})` : "No content");

  return (
    <div className="p-4 base-component rounded-md hover:bg-muted/50 transition-colors">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <StatusIcon status={run.status} />
          <StatusBadge status={run.status} />
        </div>
        {spec && spec.status !== "cancelled" && spec.kind === "scheduled" ? (
          <Button
            size="sm"
            onClick={() => onDelete(spec.id)}
            className="p-0 w-9 h-9 text-destructive hover:text-destructive/80 base-component flex items-center justify-center min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px]"
            title="Delete scheduled post"
          >
            <Trash2 size={16} />
          </Button>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="p-3 bg-muted rounded">
          <div className="text-foreground line-clamp-2">{preview}</div>
        </div>

        <div className="text-xs text-muted-foreground">
          <Clock size={12} className="mr-1 inline" />
          Fires: {new Date(run.scheduledFor).toLocaleString()}
        </div>

        {run.status === "failed" && run.error && (
          <div className="mt-2 rounded border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
            <strong>Error:</strong> {run.error}
          </div>
        )}

        {run.executedAt && (
          <div className="text-xs text-muted-foreground mt-3">
            {run.status === "completed" ? "Completed" : "Failed"} at:{" "}
            {new Date(run.executedAt).toLocaleDateString()} •{" "}
            {new Date(run.executedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export const ScheduledPostsFeed: React.FC = () => {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "completed" | "failed">("all");

  const { data: specs = [], isLoading: isLoadingSpecs } = useQuery({
    queryKey: jobSpecsQueryKey,
    queryFn: () => apiClient.social.jobs.specs.list(),
    select: (response) => response.specs,
  });

  const runsFilter: RunsFilter | undefined = filter === "all" ? undefined : { status: filter };
  const { data: runs = [], isLoading: isLoadingRuns } = useQuery({
    queryKey: jobRunsQueryKey(runsFilter),
    queryFn: () => apiClient.social.jobs.runs.list(runsFilter ?? undefined),
    select: (response) => response.runs,
    refetchInterval: 30_000,
  });

  const cancelSpec = useMutation({
    mutationFn: (specId: string) =>
      apiClient.social.jobs.specs.update({ id: specId, status: "cancelled" }),
    onSuccess: () => {
      toast.success("Scheduled Post Deleted", {
        description: "The scheduled post has been removed.",
      });
      void queryClient.invalidateQueries({ queryKey: jobSpecsQueryKey });
      void queryClient.invalidateQueries({ queryKey: jobRunsQueryKey() });
    },
  });

  const specById = new Map(specs.map((spec) => [spec.id, spec]));
  const items: FeedItem[] = runs
    .map((run) => ({ run, spec: specById.get(run.specId) }))
    .filter((item) => item.spec?.status !== "cancelled" || item.run.status !== "pending");

  const sortedItems = items.sort((a, b) => {
    if (a.run.status === "pending" && b.run.status !== "pending") return -1;
    if (b.run.status === "pending" && a.run.status !== "pending") return 1;
    return new Date(a.run.scheduledFor).getTime() - new Date(b.run.scheduledFor).getTime();
  });

  const pendingCount = runs.filter((run) => run.status === "pending").length;
  const completedCount = runs.filter((run) => run.status === "completed").length;
  const failedCount = runs.filter((run) => run.status === "failed").length;

  if (isLoadingSpecs || isLoadingRuns) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Scheduled Posts</h2>
        <p className="text-sm text-muted-foreground">Loading scheduled posts…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Scheduled Posts</h2>
        <div className="flex items-center gap-2">
          <Link
            to="/results"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Results
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="flex items-center gap-2 max-w-32">
                {filter === "all" && `All (${runs.length})`}
                {filter === "pending" && `Pending (${pendingCount})`}
                {filter === "completed" && `Completed (${completedCount})`}
                {filter === "failed" && `Failed (${failedCount})`}
                <ChevronDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setFilter("all")}
                className={filter === "all" ? "bg-accent" : ""}
              >
                All ({runs.length})
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setFilter("pending")}
                className={filter === "pending" ? "bg-accent" : ""}
              >
                Pending ({pendingCount})
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setFilter("completed")}
                className={filter === "completed" ? "bg-accent" : ""}
              >
                Completed ({completedCount})
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setFilter("failed")}
                className={filter === "failed" ? "bg-accent" : ""}
              >
                Failed ({failedCount})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {sortedItems.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar size={48} className="mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-lg font-medium mb-2">No scheduled posts</p>
          <p>
            {filter === "all"
              ? "You haven't scheduled any posts yet. Use the editor to schedule your first post!"
              : `No ${filter} scheduled posts found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedItems.map((item) => (
            <FeedListItem
              key={item.run.id}
              item={item}
              onDelete={(specId) => cancelSpec.mutate(specId)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
