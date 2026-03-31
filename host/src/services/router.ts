import type { RouterClient } from "every-plugin/orpc";
import { ORPCError, os } from "every-plugin/orpc";
import { z } from "every-plugin/zod";
import type { PluginResult } from "./plugins";

export interface RouterMount {
  key: string;
  title: string;
  suffix: `/${string}` | "";
  router: unknown;
}

const PluginSummarySchema = z.object({
  key: z.string(),
  name: z.string(),
  remoteUrl: z.string().url(),
  version: z.string().optional(),
  docsPath: z.string(),
  rpcPath: z.string(),
});

function getPluginSummaries(plugins: PluginResult) {
  return Object.entries(plugins.plugins)
    .filter(([key]) => key !== "api")
    .map(([key, plugin]) => ({
      key,
      name: plugin.name,
      remoteUrl: plugin.metadata.remoteUrl,
      version: plugin.metadata.version,
      docsPath: `/api/plugins/${encodeURIComponent(key)}`,
      rpcPath: `/api/rpc/plugins/${encodeURIComponent(key)}`,
    }));
}

export function createRouter(plugins: PluginResult) {
  const baseRouter = {
    health: os.route({ method: "GET", path: "/health" }).handler(() => "OK"),
    plugins: {
      list: os
        .route({ method: "GET", path: "/plugins" })
        .output(z.object({ data: z.array(PluginSummarySchema) }))
        .handler(() => ({ data: getPluginSummaries(plugins) })),
      get: os
        .route({ method: "GET", path: "/plugins/{key}" })
        .input(z.object({ key: z.string() }))
        .output(PluginSummarySchema)
        .handler(({ input }) => {
          const plugin = getPluginSummaries(plugins).find((entry) => entry.key === input.key);

          if (!plugin) {
            throw new ORPCError("NOT_FOUND", {
              message: `Plugin '${input.key}' not found`,
            });
          }

          return plugin;
        }),
    },
    ...((plugins.api?.router as Record<string, unknown> | null) ?? {}),
  } as const;

  return baseRouter;
}

export function createRouterMounts(plugins: PluginResult): RouterMount[] {
  const baseRouter = createRouter(plugins);
  const pluginRouters = Object.fromEntries(
    Object.entries(plugins.plugins)
      .filter(([key, plugin]) => key !== "api" && Boolean(plugin.router))
      .map(([key, plugin]) => [
        key,
        os.prefix(`/plugins/${encodeURIComponent(key)}`).router(plugin.router as any),
      ]),
  );

  return [
    {
      key: "api",
      title: plugins.api?.name ?? "api",
      suffix: "",
      router: {
        ...baseRouter,
        plugins: {
          list: baseRouter.plugins.list,
          get: baseRouter.plugins.get,
          ...pluginRouters,
        },
      },
    },
  ];
}

export type AppRouter = ReturnType<typeof createRouter>;
export type AppRouterClient = RouterClient<AppRouter>;
