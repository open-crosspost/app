import { getNetworkIdForAccount } from "../network";
import type { ClientRuntimeConfig } from "../types";

export type { ActiveRuntimeInfo } from "../types";

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: Partial<ClientRuntimeConfig>;
  }
}

export function getRuntimeConfig(): Partial<ClientRuntimeConfig> | undefined {
  if (typeof window === "undefined") return undefined;
  return window.__RUNTIME_CONFIG__;
}

export function getActiveRuntime(runtimeConfig?: Partial<ClientRuntimeConfig>) {
  return runtimeConfig?.runtime;
}

export function getRuntimeBasePath(runtimeConfig?: Partial<ClientRuntimeConfig>) {
  return getActiveRuntime(runtimeConfig)?.runtimeBasePath || "/";
}

export function buildRuntimeHref(pathname: string, runtimeConfig?: Partial<ClientRuntimeConfig>) {
  const basePath = getRuntimeBasePath(runtimeConfig);
  if (basePath === "/") {
    return pathname;
  }

  if (!pathname.startsWith("/")) {
    return `${basePath}/${pathname}`;
  }

  return pathname === "/" ? basePath : `${basePath}${pathname}`;
}

export function buildPublishedAccountHref(accountId: string) {
  return `/apps/${encodeURIComponent(accountId)}`;
}

export function buildPublishedGatewayHref(accountId: string, gatewayId: string) {
  return `${buildPublishedAccountHref(accountId)}/${encodeURIComponent(gatewayId)}`;
}

export function buildPublishedGatewayRunHref(accountId: string, gatewayId: string) {
  return `${buildPublishedGatewayHref(accountId, gatewayId)}/run`;
}

export function buildHostRuntimeHref(accountId: string, gatewayId: string) {
  return `/_runtime/${encodeURIComponent(accountId)}/${encodeURIComponent(gatewayId)}`;
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

export function getRepository(config?: Partial<ClientRuntimeConfig>): string | undefined {
  const cfg = config ?? getRuntimeConfig();
  return cfg?.repository;
}
