import type { AccountActivityEntry } from "@crosspost/plugin/types";
import { TimePeriod } from "@crosspost/plugin/types";
import { useQuery } from "@tanstack/react-query";
import { getClient } from "@/lib/authorization-service";

function normalizeLeaderboardResponse(responseData: unknown): {
  entries: AccountActivityEntry[];
  meta: { pagination: { total: number } };
} {
  const fallbackMeta = { pagination: { total: 0 } };

  if (!responseData) {
    return { entries: [], meta: fallbackMeta };
  }

  if (Array.isArray(responseData)) {
    return { entries: responseData as AccountActivityEntry[], meta: fallbackMeta };
  }

  if (typeof responseData === "object") {
    const maybe = responseData as {
      entries?: unknown;
      meta?: { pagination?: { total?: number } };
    };

    if (Array.isArray(maybe.entries)) {
      return {
        entries: maybe.entries as AccountActivityEntry[],
        meta: {
          pagination: {
            total: Number(maybe.meta?.pagination?.total ?? maybe.entries.length ?? 0),
          },
        },
      };
    }

    if (maybe.entries && typeof maybe.entries === "object") {
      const nested = maybe.entries as {
        entries?: unknown;
        meta?: { pagination?: { total?: number } };
      };
      if (Array.isArray(nested.entries)) {
        return {
          entries: nested.entries as AccountActivityEntry[],
          meta: {
            pagination: {
              total: Number(nested.meta?.pagination?.total ?? nested.entries.length ?? 0),
            },
          },
        };
      }
    }
  }

  return { entries: [], meta: fallbackMeta };
}

export const fetchLeaderboard = async ({
  limit,
  offset,
  timeframe,
  startDate,
  endDate,
  platforms,
}: {
  limit: number;
  offset: number;
  timeframe: TimePeriod;
  startDate?: string;
  endDate?: string;
  platforms?: string[];
}): Promise<{
  entries: AccountActivityEntry[];
  meta?: { pagination: { total: number } };
}> => {
  const client = getClient();
  const response = await client.activity.getLeaderboard({
    limit,
    offset,
    timeframe: timeframe as any,
    startDate,
    endDate,
    platforms: platforms as any,
  });

  const normalized = normalizeLeaderboardResponse(response.data);
  return normalized;
};

export const useLeaderboardQuery = (limit: number = 3) => {
  return useQuery<AccountActivityEntry[]>({
    queryKey: ["leaderboard", limit],
    queryFn: async () => {
      const result = await fetchLeaderboard({
        limit,
        offset: 0,
        timeframe: TimePeriod.ALL,
      });
      return result.entries; // Return just the entries array
    },
  });
};
