import { createORPCClient, onError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import { getRuntimeConfig } from "everything-dev/ui/runtime";
import { toast } from "sonner";
import type { ApiContract } from "../api-contract";

export type { ApiContract };

type BaseApiClient = ContractRouterClient<ApiContract["api"]>;
type PluginClientMap = {
  [K in keyof ApiContract["plugins"]]: ContractRouterClient<ApiContract["plugins"][K]>;
};
export type ApiClient = BaseApiClient & {
  api: BaseApiClient;
  plugins: PluginClientMap;
};

declare global {
  var $apiClient: ApiClient | undefined;
}

function createApiLink() {
  return new RPCLink({
    url: () => {
      if (typeof window === "undefined") {
        throw new Error("RPCLink is not allowed on the server side.");
      }
      return `${window.location.origin}/api/rpc`;
    },
    interceptors: [
      onError((error: unknown) => {
        console.error("oRPC API Error:", error);

        if (error && typeof error === "object" && "message" in error) {
          const message = String(error.message).toLowerCase();
          if (
            message.includes("fetch") ||
            message.includes("network") ||
            message.includes("failed to fetch")
          ) {
            toast.error("Unable to connect to API", {
              id: "api-connection-error",
              description: "The API is currently unavailable. Please try again later.",
            });
          }
        }
      }),
    ],
    fetch(url, options) {
      return fetch(url, {
        ...options,
        credentials: "include",
      });
    },
  });
}

function createPluginLink(key: string) {
  return new RPCLink({
    url: () => {
      if (typeof window === "undefined") {
        throw new Error("RPCLink is not allowed on the server side.");
      }
      return `${window.location.origin}/api/rpc/plugins/${encodeURIComponent(key)}`;
    },
    interceptors: [
      onError((error: unknown) => {
        console.error(`oRPC Plugin Error (${key}):`, error);
      }),
    ],
    fetch(url, options) {
      return fetch(url, {
        ...options,
        credentials: "include",
      });
    },
  });
}

let clientSideApiClient: ApiClient | null = null;

function getClientSideApiClient(): ApiClient {
  if (clientSideApiClient) return clientSideApiClient;
  const client = createORPCClient(createApiLink()) as unknown as BaseApiClient;
  const runtimeConfig = getRuntimeConfig();
  const plugins = Object.fromEntries(
    Object.keys(runtimeConfig?.plugins ?? {}).map((key) => [
      key,
      createORPCClient(createPluginLink(key)) as unknown,
    ]),
  ) as PluginClientMap;

  clientSideApiClient = {
    ...(client as object),
    api: client,
    plugins,
  } as ApiClient;
  return clientSideApiClient;
}

function getActiveApiClient(): ApiClient {
  return globalThis.$apiClient ?? getClientSideApiClient();
}

export const apiClient: ApiClient = new Proxy({} as ApiClient, {
  get(_target, prop) {
    if (prop === "then") return undefined;
    const client = getActiveApiClient() as unknown as Record<string, unknown>;
    if (prop === "api" || prop === "plugins") {
      return client[prop as string];
    }
    const value =
      client.api && typeof client.api === "object"
        ? (client.api as Record<string, unknown>)[prop as string]
        : client[prop as string];
    if (typeof value === "function") {
      return (...args: unknown[]) => (value as (...a: unknown[]) => unknown)(...args);
    }
    return value;
  },
});
