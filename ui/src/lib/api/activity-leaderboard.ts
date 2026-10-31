import { ACTIVITY_API_BASE_URL } from "@/config";

/**
 * Public Activity reads (activity.nearbuilders.org) — no source key needed.
 * Only the endpoints the leaderboard consumes; production event submission
 * lives server-side in the api/connectors plugins.
 */

export const ACTIVITY_PERIODS = ["weekly", "monthly", "all-time"] as const;
export type ActivityPeriod = (typeof ACTIVITY_PERIODS)[number];

export type ActivityBreakdown = {
  source: string;
  sourceDisplayName: string;
  type: string;
  pointValue: number;
  trustStatus: string;
  scoreMultiplier: number;
  eventCount: number;
  score: number;
};

export type ActivityLeaderboardEntry = {
  rank: number;
  actor: string;
  score: number;
  eventCount: number;
  breakdown: ActivityBreakdown[];
};

export type ActivityProjection = {
  state: string;
  rebuiltAt: string | null;
  seen: number;
  applied: number;
  hidden: number;
};

export type ActivityLeaderboard = {
  period: ActivityPeriod;
  startsAt: string | null;
  endsAt: string | null;
  generatedAt: string;
  projection: ActivityProjection;
  data: ActivityLeaderboardEntry[];
};

export class ActivityServiceError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ActivityServiceError";
    this.status = status;
  }
}

export async function fetchActivityLeaderboard({
  period,
  sourceId,
  limit = 100,
}: {
  period: ActivityPeriod;
  /** Omit for the whole-NEAR-ecosystem view. */
  sourceId?: string;
  limit?: number;
}): Promise<ActivityLeaderboard> {
  const url = new URL(`${ACTIVITY_API_BASE_URL}/v1/leaderboard`);
  url.searchParams.set("period", period);
  if (sourceId) url.searchParams.set("source", sourceId);
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new ActivityServiceError(
      `Activity leaderboard request failed (${response.status})`,
      response.status,
    );
  }
  return (await response.json()) as ActivityLeaderboard;
}

export async function fetchActivityHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${ACTIVITY_API_BASE_URL}/v1/health`);
    return response.ok;
  } catch {
    return false;
  }
}
