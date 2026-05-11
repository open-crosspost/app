import { TimePeriod } from "@crosspost/plugin/types";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/app";
import bronzePng from "@/assets/badges/leaderboard-bronze.png";
import goldPng from "@/assets/badges/leaderboard-gold.png";
import silverPng from "@/assets/badges/leaderboard-silver.png";
import type { BadgeProps } from "@/components/badges/inline-badges";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fetchLeaderboard } from "@/lib/api/leaderboard";

const badgeImages: Record<number, string> = {
  1: goldPng,
  2: silverPng,
  3: bronzePng,
};

export function LeaderboardBadge({ accountId }: BadgeProps) {
  const apiClient = useApiClient();
  const { data: leaderboard } = useQuery({
    queryKey: ["social", "leaderboard-badge", 3],
    queryFn: async () => {
      const result = await fetchLeaderboard(apiClient, {
        limit: 3,
        offset: 0,
        timeframe: TimePeriod.ALL,
      });
      return result.entries;
    },
  });

  if (!leaderboard || !Array.isArray(leaderboard)) {
    return null;
  }

  const userRankInfo = leaderboard.find((entry) => entry.signerId === accountId);

  if (!userRankInfo) {
    return null;
  }

  const rank = leaderboard.indexOf(userRankInfo) + 1;
  let badgeImage = "";
  let tooltipText = "";

  switch (rank) {
    case 1:
      badgeImage = badgeImages[1];
      tooltipText = "Leaderboard #1";
      break;
    case 2:
      badgeImage = badgeImages[2];
      tooltipText = "Leaderboard #2";
      break;
    case 3:
      badgeImage = badgeImages[3];
      tooltipText = "Leaderboard #3";
      break;
    default:
      return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full`}>
            <img src={badgeImage} alt={tooltipText} className="w-5 h-5 rounded-full" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="rounded-none">
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
