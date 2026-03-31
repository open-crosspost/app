import type { RouterClient } from "every-plugin/orpc";
import { os } from "every-plugin/orpc";
import type { PluginResult } from "./plugins";

export function createRouter(plugins: PluginResult) {
  const baseRouter = {
    health: os.route({ method: "GET", path: "/health" }).handler(() => "OK"),
  } as const;

  const pluginRouters = Object.values(plugins.plugins)
    .filter((plugin) => plugin.key !== "api")
    .map((plugin) => plugin.router as Record<string, unknown>);

  if (!plugins.status.available || !plugins.api) {
    if (plugins.status.error) {
      console.warn("[Router] Plugin router not available, using base router only");
    } else {
      console.log("[Router] Using base router only");
    }
    return pluginRouters.length > 0
      ? { ...baseRouter, ...Object.assign({}, ...pluginRouters) }
      : baseRouter;
  }

  return {
    ...baseRouter,
    ...(plugins.api as { router?: Record<string, unknown> }).router,
    ...Object.assign({}, ...pluginRouters),
  } as const;
}

export type AppRouter = ReturnType<typeof createRouter>;
export type AppRouterClient = RouterClient<AppRouter>;
