import { createServer } from "node:http";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import { RPCHandler } from "@orpc/server/node";
import type { Context } from "effect";

import { createPluginRuntime } from "every-plugin";
import packageJson from "../package.json" with { type: "json" };
import pluginDevConfig from "../plugin.dev";
import type { contract } from "../src/contract";
import Plugin from "../src/index";

const TEST_PLUGIN_ID = packageJson.name;
const TEST_CONFIG = {
  ...pluginDevConfig.config,
  variables: {
    ...(pluginDevConfig.config.variables ?? {}),
    agentApiBaseUrl: "https://agent-api.test",
    outlayerApiUrl: "https://outlayer.test",
  },
  secrets: {
    ...(pluginDevConfig.config.secrets ?? {}),
    NEAR_INTENTS_AGENT_API_KEY: "naa_test_key",
  },
};

const TEST_REGISTRY = {
  [TEST_PLUGIN_ID]: {
    module: Plugin,
    description: "Integration test runtime",
  },
} as const;

export const runtime = createPluginRuntime({
  registry: TEST_REGISTRY,
  secrets: {},
});

/** The pristine fetch, captured before tests swap globalThis.fetch for upstream mocks. */
const rpcFetch = globalThis.fetch.bind(globalThis);

let server: ReturnType<typeof createServer> | null = null;
let baseUrl = "";
let pluginEffectContext: Context.Context<any> | null = null;

export const outboundCalls: { url: string; init?: RequestInit }[] = [];

export const outboundTransfers: {
  agentId: string;
  recipient: string;
  amountNear: string;
  idempotencyKey?: string;
}[] = [];

const TEST_PLUGINS = {
  "agent-connect": {
    client: () => ({
      agentTransfer: async (input: {
        agentId: string;
        recipient: string;
        amountNear: string;
        idempotencyKey?: string;
      }) => {
        outboundTransfers.push(input);
        return { correlationId: "op_transfer", status: "QUEUED", grantId: "grant_1" };
      },
    }),
  },
};

export function mockUpstream(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    outboundCalls.push({ url, init });
    return Promise.resolve(handler(url, init));
  }) as typeof fetch;
  return () => {
    globalThis.fetch = originalFetch;
    outboundCalls.length = 0;
  };
}

export async function getPluginClient(context?: { userId?: string; near?: unknown }) {
  if (!server) {
    const { router, initialized } = await runtime.usePlugin(
      TEST_PLUGIN_ID,
      TEST_CONFIG,
      TEST_PLUGINS,
    );
    const rpcHandler = new RPCHandler(router);
    const effectContext = initialized.effectContext;
    pluginEffectContext = effectContext;

    const testPort = 3400 + Math.floor(Math.random() * 1000);
    baseUrl = `http://localhost:${testPort}`;

    server = createServer(async (req, res) => {
      const url = new URL(req.url!, baseUrl);

      if (url.pathname.startsWith("/rpc")) {
        let requestContext: Record<string, unknown> = {};
        if (req.headers["x-test-user"]) {
          requestContext = { ...requestContext, userId: req.headers["x-test-user"] as string };
        }
        const result = await rpcHandler.handle(req, res, {
          prefix: "/rpc",
          context: { ...requestContext, "effect/context": effectContext },
        });
        if (result.matched) return;
      }

      res.statusCode = 404;
      res.end("Route not found");
    });

    await new Promise<void>((resolve, reject) => {
      server?.listen(testPort, "127.0.0.1", () => resolve());
      server?.on("error", reject);
    });
  }

  const link = new RPCLink({
    origin: baseUrl,
    url: "/rpc",
    fetch: rpcFetch,
    headers: context
      ? {
          ...(context.userId && { "x-test-user": context.userId }),
          ...(context.near !== undefined && { "x-test-near": JSON.stringify(context.near) }),
        }
      : {},
  });

  const client: ContractRouterClient<typeof contract> = createORPCClient(link);
  return client;
}

export async function teardown() {
  if (server) {
    await new Promise<void>((resolve) => {
      server?.close(() => resolve());
    });
    server = null;
  }
  await runtime.shutdown();
}
