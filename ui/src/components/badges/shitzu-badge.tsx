import { useQuery } from "@tanstack/react-query";
import { getNearActions, useAuthClient } from "@/app";
import type { BadgeProps } from "@/components/badges/inline-badges";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const SHITZU_REWARDS_CONTRACT_ID = "rewards.0xshitzu.near";

export function ShitzuBadge({ accountId }: BadgeProps) {
  const authClient = useAuthClient();
  const near = getNearActions(authClient);
  const { data: hasNft, isLoading } = useQuery({
    queryKey: ["shitzuNft", accountId],
    queryFn: async () => {
      if (!accountId) return false;

      try {
        const tokens = await near.client.view<unknown[]>(
          SHITZU_REWARDS_CONTRACT_ID,
          "primary_nft_of",
          { account_id: accountId },
        );
        return Array.isArray(tokens) && tokens.length > 0;
      } catch (error) {
        console.error("Error checking Shitzu NFT:", error);
        return false;
      }
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading || !hasNft) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full`}>
            <img
              src="https://raw.githubusercontent.com/Shitzu-Apes/brand-kit/refs/heads/main/logo/shitzu.webp"
              alt="Shitzu NFT"
              className="w-5 h-5 rounded-full"
            />
          </div>
        </TooltipTrigger>
        <TooltipContent className="rounded-none">
          <p>Shitzu NFT Staker</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
