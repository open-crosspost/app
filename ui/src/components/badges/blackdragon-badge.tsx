import { useQuery } from "@tanstack/react-query";
import { getNearActions, useAuthClient } from "@/app";
import blackdragonBadgePng from "@/assets/badges/blackdragon-badge.png";
import type { BadgeProps } from "@/components/badges/inline-badges";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const BLACKDRAGON_NFT_CONTRACT_ID = "blackdragonforever.nfts.tg";

export function BlackdragonBadge({ accountId }: BadgeProps) {
  const authClient = useAuthClient();
  const near = getNearActions(authClient);
  const { data: hasNft, isLoading } = useQuery({
    queryKey: ["blackdragonNft", accountId],
    queryFn: async () => {
      if (!accountId) return false;

      try {
        const tokens = await near.client.view<unknown[]>(
          BLACKDRAGON_NFT_CONTRACT_ID,
          "nft_tokens_for_owner",
          { account_id: accountId },
        );
        return Array.isArray(tokens) && tokens.length > 0;
      } catch (error) {
        console.error("Error checking Blackdragon NFT:", error);
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
            <img src={blackdragonBadgePng} alt="Blackdragon NFT" className="w-5 h-5 rounded-full" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="rounded-none">
          <p>Blackdragon NFT Holder</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
