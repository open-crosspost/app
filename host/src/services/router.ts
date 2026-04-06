import { os } from "every-plugin/orpc";
import type { PluginResult } from "./plugins";

export interface RouterMount {
  key: string;
  title: string;
  suffix: `/${string}` | "";
  router: unknown;
}

function encodePathKey(key: string): string {
  return key
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function createBaseRouter(plugins: PluginResult) {
  return {
    health: os.route({ method: "GET", path: "/health" }).handler(() => "OK"),
    ...((plugins.api?.router as Record<string, unknown> | null) ?? {}),
  } as const;
}

export function createRouterMounts(plugins: PluginResult): RouterMount[] {
  const mounts: RouterMount[] = [
    {
      key: "api",
      title: plugins.api?.name ?? "api",
      suffix: "",
      router: createBaseRouter(plugins),
    },
  ];

  for (const [key, plugin] of Object.entries(plugins.plugins)) {
    if (key === "api" || !plugin.router) continue;

    mounts.push({
      key,
      title: plugin.name,
      suffix: `/${encodePathKey(key)}`,
      router: plugin.router,
    });
  }

  return mounts;
}
