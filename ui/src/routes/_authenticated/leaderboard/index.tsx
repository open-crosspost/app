import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { Fragment, useState } from "react";
import { BackButton } from "@/components/back-button";
import { InlineBadges } from "@/components/badges/inline-badges";
import { Button } from "@/components/ui/button";
import {
  ACTIVITY_PERIODS,
  type ActivityBreakdown,
  type ActivityPeriod,
  type ActivityServiceError,
  fetchActivityHealth,
  fetchActivityLeaderboard,
} from "@/lib/api/activity-leaderboard";

type SourceFilter = "opencrosspost" | "ecosystem";

const SOURCE_IDS: Record<SourceFilter, string | undefined> = {
  opencrosspost: "opencrosspost.com",
  ecosystem: undefined,
};

const PERIOD_LABELS: Record<ActivityPeriod, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  "all-time": "All Time",
};

export const Route = createFileRoute("/_authenticated/leaderboard/")({
  component: LeaderboardPage,
  validateSearch: (search: Record<string, unknown>) => ({
    ...((ACTIVITY_PERIODS as readonly string[]).includes(String(search.period))
      ? { period: search.period as ActivityPeriod }
      : {}),
    ...(search.source === "ecosystem" ? { source: "ecosystem" as const } : {}),
  }),
});

function LeaderboardPage() {
  const search = useSearch({ from: Route.id });
  const navigate = useNavigate({ from: Route.fullPath });
  const [expandedActor, setExpandedActor] = useState<string | null>(null);

  const period = search.period ?? "weekly";
  const source: SourceFilter = search.source ?? "opencrosspost";
  const sourceId = SOURCE_IDS[source];

  const query = useQuery({
    queryKey: ["activity-leaderboard", period, source],
    queryFn: () => fetchActivityLeaderboard({ period, sourceId }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const healthQuery = useQuery({
    queryKey: ["activity-health"],
    queryFn: fetchActivityHealth,
    enabled: query.isError,
    staleTime: 15_000,
    retry: false,
  });

  const setPeriod = (next: ActivityPeriod) => navigate({ search: { ...search, period: next } });
  const setSource = (next: SourceFilter) =>
    navigate({ search: { ...search, source: next === "ecosystem" ? "ecosystem" : undefined } });

  const leaderboard = query.data;
  const entries = leaderboard?.data ?? [];
  const projection = leaderboard?.projection;
  const projectionDegraded = !!projection && projection.state !== "ready";
  const serviceError = query.error as ActivityServiceError | null;
  const underReview = source === "opencrosspost" && entries.length === 0 && !query.isError;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <BackButton />
        <Button
          variant="outline"
          size="sm"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCw className={`size-4 ${query.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <h1 className="text-xl font-bold sm:text-2xl">Leaderboard</h1>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Time period">
          {ACTIVITY_PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={period === p}
              onClick={() => setPeriod(p)}
              className={`border-2 border-primary px-3 py-1.5 text-sm font-medium transition-colors ${
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground hover:bg-muted"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Source">
          <button
            type="button"
            role="tab"
            aria-selected={source === "opencrosspost"}
            onClick={() => setSource("opencrosspost")}
            className={`border-2 border-primary px-3 py-1.5 text-sm font-medium transition-colors ${
              source === "opencrosspost"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-foreground hover:bg-muted"
            }`}
          >
            Open Crosspost
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={source === "ecosystem"}
            onClick={() => setSource("ecosystem")}
            className={`border-2 border-primary px-3 py-1.5 text-sm font-medium transition-colors ${
              source === "ecosystem"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-foreground hover:bg-muted"
            }`}
          >
            Whole Ecosystem
          </button>
        </div>
      </div>

      {leaderboard?.startsAt && leaderboard?.endsAt && (
        <p className="mt-3 text-sm text-muted-foreground">
          {formatDate(leaderboard.startsAt)} – {formatDate(leaderboard.endsAt)} · updated{" "}
          {formatDate(leaderboard.generatedAt)}
        </p>
      )}

      {projectionDegraded && (
        <div className="mt-4 border-2 border-dashed border-primary/60 bg-muted px-4 py-3 text-sm">
          Leaderboard projection is <strong>{projection?.state}</strong> — scores may be incomplete
          or stale. No need to retry; this page picks up fresh data automatically.
        </div>
      )}

      {query.isError && (
        <div className="mt-4 border-2 border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p>
            Failed to load the leaderboard
            {serviceError?.status ? ` (HTTP ${serviceError.status})` : ""}.
          </p>
          <p className="mt-1 text-destructive/80">
            {healthQuery.isPending
              ? "Checking the Activity service status…"
              : healthQuery.data === false
                ? "The Activity service is degraded — this is on their side, not yours. Retry in a bit."
                : "The Activity service looks healthy — try again."}
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => query.refetch()}>
            Retry
          </Button>
        </div>
      )}

      {!query.isError && !query.isLoading && entries.length === 0 && !underReview && (
        <div className="mt-6 rounded-lg border-2 border-primary bg-background px-6 py-10 text-center">
          <p className="text-muted-foreground">No scored activity for this period yet.</p>
        </div>
      )}

      {underReview && (
        <div className="mt-6 rounded-lg border-2 border-primary bg-background px-6 py-10 text-center">
          <p className="font-medium">No Open Crosspost events scored yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Events from newly registered sources count on the leaderboard once the source is
            approved — everything posted before then is scored retroactively.
          </p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="relative mt-4 max-h-[70vh] overflow-y-auto rounded-lg border-2 border-primary bg-background">
          <table className="min-w-full">
            <thead className="sticky top-0 z-10 bg-background [&_tr]:border-b-2 [&_tr]:border-primary [&_tr]:hover:bg-transparent">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  NEAR Account
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Events
                </th>
                <th className="w-8 px-2 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {entries.map((entry) => {
                const expanded = expandedActor === entry.actor;
                return (
                  <Fragment key={entry.actor}>
                    <tr
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => setExpandedActor(expanded ? null : entry.actor)}
                    >
                      <td className="px-4 py-3 text-sm">#{entry.rank}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Link
                            to="/profile/$accountId"
                            params={{ accountId: entry.actor }}
                            className="block truncate text-primary hover:text-primary/80 hover:underline"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {entry.actor}
                          </Link>
                          <InlineBadges accountId={entry.actor} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">{entry.score}</td>
                      <td className="px-4 py-3 text-sm">{entry.eventCount}</td>
                      <td className="px-2 py-3 text-muted-foreground">
                        {expanded ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="bg-muted/50">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {entry.breakdown.map((item) => (
                              <BreakdownBadge key={`${item.source}:${item.type}`} item={item} />
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BreakdownBadge({ item }: { item: ActivityBreakdown }) {
  return (
    <span className="border border-border bg-background px-2 py-1 text-xs text-foreground">
      <span className="font-medium">{item.sourceDisplayName}</span>
      <span className="text-muted-foreground"> · {item.type}</span>
      <span className="text-muted-foreground">
        {" "}
        — {item.eventCount}× {item.pointValue}pt = {item.score}
      </span>
      {item.trustStatus !== "standard" && (
        <span className="ml-1 font-medium">({item.trustStatus})</span>
      )}
    </span>
  );
}

function formatDate(value: string): string {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}
