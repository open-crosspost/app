import type { RouterClient } from "every-plugin/orpc";
import { os } from "every-plugin/orpc";
import type { PluginResult } from "./plugins";

export function createRouter(plugins: PluginResult) {
  const baseRouter = {
    health: os.route({ method: "GET", path: "/health" }).handler(() => "OK"),
  } as const;

  void plugins;
  return baseRouter;
}

export type AppRouter = ReturnType<typeof createRouter>;
export type AppRouterClient = RouterClient<AppRouter>;
