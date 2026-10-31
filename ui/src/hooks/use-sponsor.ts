import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/app";
import { NETWORK_ID } from "@/config";

export function sponsorStatsQueryKey() {
  return ["connectors", "sponsorStats"] as const;
}

export function useSponsorStats(enabled = true) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: sponsorStatsQueryKey(),
    queryFn: () => apiClient.connectors.sponsorStats(),
    staleTime: 60 * 1000,
    enabled,
  });
}

export function useAppSponsorStatus() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: ["connectors", "appSponsorStatus"] as const,
    queryFn: () => apiClient.connectors.appSponsorStatus(),
    staleTime: 30 * 1000,
  });
}

export function useRelayerInfo() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: ["auth", "nearRelayerInfo", NETWORK_ID] as const,
    queryFn: () => apiClient.auth.nearRelayerInfo({ network: NETWORK_ID }),
    staleTime: 60 * 1000,
  });
}
