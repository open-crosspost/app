import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useApiClient } from "@/app";
import { findCampaignById, listCampaigns, mergeCampaigns } from "@/lib/campaigns";
import { fetchServerCampaigns, socialCampaignsQueryKey } from "@/lib/social";

const localCampaigns = listCampaigns();

export function useCampaigns() {
  const apiClient = useApiClient();
  const { data: serverCampaigns } = useQuery({
    queryKey: socialCampaignsQueryKey,
    queryFn: () => fetchServerCampaigns(apiClient),
    staleTime: 60_000,
  });

  const campaigns = useMemo(
    () => mergeCampaigns(serverCampaigns ?? [], localCampaigns),
    [serverCampaigns],
  );

  return { campaigns };
}

export function useCampaign(campaignId: string | undefined) {
  const { campaigns } = useCampaigns();
  return findCampaignById(campaigns, campaignId);
}
