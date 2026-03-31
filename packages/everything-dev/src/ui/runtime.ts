import { getNetworkIdForAccount } from "../network";
import type { ClientRuntimeConfig } from "../types";

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: Partial<ClientRuntimeConfig>;
  }
}

export function getRuntimeConfig(): Partial<ClientRuntimeConfig> | undefined {
  if (typeof window === "undefined") return undefined;
  return window.__RUNTIME_CONFIG__;
}

export function getAssetsUrl(config?: Partial<ClientRuntimeConfig>): string {
  const cfg = config ?? getRuntimeConfig();
  return cfg?.assetsUrl ?? "";
}

export function getHostUrl(config?: Partial<ClientRuntimeConfig>): string {
  const cfg = config ?? getRuntimeConfig();
  if (typeof window === "undefined") return "";
  return cfg?.hostUrl ?? window.location.origin;
}

export function getApiBaseUrl(config?: Partial<ClientRuntimeConfig>): string {
  const cfg = config ?? getRuntimeConfig();
  const base = cfg?.rpcBase;
  if (typeof window === "undefined") return "/api/rpc";
  return base ? `${window.location.origin}${base}` : `${window.location.origin}/api/rpc`;
}

export function getAccount(config?: Partial<ClientRuntimeConfig>): string {
  const cfg = config ?? getRuntimeConfig();
  return cfg?.account ?? "every.near";
}

export function getNetworkId(config?: Partial<ClientRuntimeConfig>): "mainnet" | "testnet" {
  const cfg = config ?? getRuntimeConfig();
  return cfg?.networkId ?? getNetworkIdForAccount(cfg?.account ?? "every.near");
}
