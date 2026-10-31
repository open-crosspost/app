import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/app";

export interface XpostGateStatus {
  enabled: boolean;
  tier1: string;
  tier2: string;
  tier3: string;
  source: string;
  priceUsd: string | null;
  refreshedAt: string | null;
  caller: {
    nearAccountId: string | null;
    balance: string | null;
    tier: number | null;
  };
}

export function xpostGateStatusQueryKey() {
  return ["connectors", "xpostGateStatus"] as const;
}

export function useXpostGate(enabled = true) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: xpostGateStatusQueryKey(),
    queryFn: () => apiClient.connectors.xpostGateStatus() as Promise<XpostGateStatus>,
    staleTime: 60 * 1000,
    enabled,
  });
}

/**
 * True when the gate blocks app-paid (sponsored) dispatch for this caller:
 * the gate is on and the caller is below Tier 1 — including no NEAR account
 * or an unreadable balance (the server refuses those, fail-closed).
 */
export function isGateBlocked(status: XpostGateStatus | undefined): boolean {
  if (!status?.enabled) return false;
  return status.caller.tier === null || status.caller.tier < 1;
}
