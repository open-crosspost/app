import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./api-client";

export const registryAppsQueryOptions = (q?: string) =>
  queryOptions({
    queryKey: ["registry-apps", q],
    queryFn: () => apiClient.listRegistryApps({ q: q || undefined, limit: 48 }),
  });

export const registryStatusQueryOptions = () =>
  queryOptions({
    queryKey: ["registry-status"],
    queryFn: () => apiClient.getRegistryStatus(),
    staleTime: 60_000,
  });
