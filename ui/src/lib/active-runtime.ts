import type { ClientRuntimeConfig } from "everything-dev/types";

export interface ActiveRuntimeInfo {
  accountId: string;
  gatewayId: string;
  runtimeBasePath: string;
  canonicalConfigUrl: string | null;
  resolvedConfig: Record<string, unknown> | null;
  title: string | null;
  hostUrl: string | null;
}

export type ActiveRuntimeConfig = ClientRuntimeConfig & {
  runtime?: ActiveRuntimeInfo;
};

export function getActiveRuntimeConfig(runtimeConfig?: Partial<ClientRuntimeConfig>) {
  return runtimeConfig as ActiveRuntimeConfig | undefined;
}

export function getActiveRuntime(runtimeConfig?: Partial<ClientRuntimeConfig>) {
  return getActiveRuntimeConfig(runtimeConfig)?.runtime;
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
