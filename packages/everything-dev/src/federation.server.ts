import { ensureNodeRuntimePlugin, loadRemoteModule, registerRemote } from "./mf";
import { verifySriForUrl } from "./integrity";
import type { RuntimeConfig } from "./types";
import type { RouterModule } from "./ui/types";

export type { RouterModule };

export async function loadRouterModule(config: RuntimeConfig): Promise<RouterModule> {
  const isLocalDev = config.ui.source === "local";
  const ssrUrl = config.ui.ssrUrl ?? (isLocalDev ? config.ui.url : undefined);

  if (!ssrUrl) {
    if (!isLocalDev) {
      throw new Error(
        "SSR URL not configured in production. Set app.ui.ssr in bos.config.json to enable SSR.",
      );
    }

    throw new Error(
      "SSR URL not configured. In local dev, set app.ui.ssr or use a UI package with SSR support.",
    );
  }

  const ssrEntryUrl = `${ssrUrl.replace(/\/$/, "")}/remoteEntry.server.js`;

  if (config.ui.ssrIntegrity) {
    await verifySriForUrl(ssrEntryUrl, config.ui.ssrIntegrity);
  }

  await ensureNodeRuntimePlugin();
  await registerRemote({
    name: config.ui.name,
    entry: ssrEntryUrl,
    type: "script",
  });

  const loadedModule = await loadRemoteModule<any>(`${config.ui.name}/Router`, { from: "build" });
  if (!loadedModule) {
    throw new Error(`Module not found: ${config.ui.name}/Router`);
  }

  return loadedModule.default as RouterModule;
}
