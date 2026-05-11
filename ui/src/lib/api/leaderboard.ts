import type { TimePeriod } from "@crosspost/plugin/types";
import type { ApiClient } from "@/app";
import { fetchSocialLeaderboard } from "@/lib/social";

export const fetchLeaderboard = async (
  apiClient: ApiClient,
  {
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
  },
) => {
  return fetchSocialLeaderboard(apiClient, {
    limit,
    offset,
    timeframe,
    startDate,
    endDate,
    platforms,
  });
};
