import { useQuery } from "@tanstack/react-query";
import BigNumber from "bignumber.js";
import { getNearActions, useAuthClient } from "@/app";
import nekoBadgePng from "@/assets/badges/neko-badge.png";
import type { BadgeProps } from "@/components/badges/inline-badges";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { convertAtomicToStandard } from "@/lib/utils/string";

const NEKO_COOKIE_CONTRACT_ID = "cookie.nekotoken.near";

export function NekoBadge({ accountId }: BadgeProps) {
  const authClient = useAuthClient();
  const near = getNearActions(authClient);
  const { data: hasBadge, isLoading } = useQuery({
    queryKey: ["nekoCookie", accountId],
    queryFn: async () => {
      if (!accountId) return false;

      try {
        const balance = (
          await near.view({
            contractId: NEKO_COOKIE_CONTRACT_ID,
            methodName: "ft_balance_of",
            args: { account_id: accountId },
          })
        )?.data?.result as string | undefined;
        const standardAmount = new BigNumber(convertAtomicToStandard(balance ?? "0", 24));
        return standardAmount.gte(new BigNumber(100000));
      } catch (error) {
        console.error("Error checking $COOKIE balance:", error);
        return false;
      }
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000, // cache for 5 mins
  });

  if (isLoading || !hasBadge) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full`}>
            <img src={nekoBadgePng} alt="Neko COOKIE Holder" className="w-5 h-5 rounded-full" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="rounded-none">
          <p>Holds 100k+ $COOKIE</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
