import { createInstance, getInstance } from "@module-federation/enhanced/runtime";
import { setGlobalFederationInstance } from "@module-federation/runtime-core";

type FederationInstance = ReturnType<typeof createInstance>;

let mfInstance: FederationInstance | null = null;

export function patchManifestFetchForSsrPublicPath(mf: FederationInstance): void {
  if (!mf || !(mf as any).loaderHook?.lifecycle?.fetch?.on) return;
  if ((mf as any).__everythingDevPatchedManifestFetch === true) return;
  (mf as any).__everythingDevPatchedManifestFetch = true;

  (mf as any).loaderHook.lifecycle.fetch.on((url: unknown, init: unknown) => {
    if (typeof url !== "string" || !url.endsWith("/mf-manifest.json")) {
      return;
    }
    return fetch(url, init as any)
      .then((res) => res.json())
      .then((json: any) => {
        json.metaData = json.metaData ?? {};
        json.metaData.ssrPublicPath =
          json.metaData.ssrPublicPath ?? url.replace(/\/mf-manifest\.json$/, "/");
        return new Response(JSON.stringify(json), {
          headers: { "content-type": "application/json" },
        });
      });
  });
}

export function getFederationInstance(): FederationInstance {
  if (mfInstance) return mfInstance;

  const existing = getInstance();
  if (existing) {
    mfInstance = existing as FederationInstance;
    setGlobalFederationInstance(mfInstance as any);
    patchManifestFetchForSsrPublicPath(mfInstance);
    return mfInstance;
  }

  mfInstance = createInstance({
    name: "host",
    remotes: [],
  }) as FederationInstance;
  setGlobalFederationInstance(mfInstance as any);
  patchManifestFetchForSsrPublicPath(mfInstance);
  return mfInstance;
}

export async function registerRemote(opts: {
  name: string;
  entry: string;
  type?: "manifest" | "script";
}): Promise<void> {
  const instance = getFederationInstance();

  const inferType = (): "manifest" | "script" => {
    if (opts.type) return opts.type;
    if (opts.entry.endsWith("/mf-manifest.json")) return "manifest";
    if (opts.entry.endsWith("/remoteEntry.js")) return "script";
    return typeof window === "undefined" ? "script" : "manifest";
  };

  const remoteType = inferType();

  instance.registerRemotes([
    {
      name: opts.name,
      entry: opts.entry,
      type: remoteType,
    },
  ]);
}

export async function loadRemoteModule<T>(
  specifier: string,
  options?: { loadFactory?: boolean; from?: "build" | "runtime" },
): Promise<T> {
  const instance = getFederationInstance();

  const isServer = typeof window === "undefined";
  if (isServer) {
    await (instance as any).initializeSharing?.("default");
  }

  const mod = await instance.loadRemote<T>(specifier, options as any);
  if (!mod) {
    throw new Error(`Failed to load remote module: ${specifier}`);
  }
  return mod;
}

export async function ensureNodeRuntimePlugin(): Promise<void> {
  const instance = getFederationInstance();
  if (typeof window !== "undefined") return;
  if ((instance as any).__nodeRuntimePluginLoaded) return;

  const mod: any = await import("@module-federation/node/runtimePlugin");
  const factory = mod?.default ?? mod;
  const plugin = typeof factory === "function" ? factory() : null;
  if (plugin) {
    instance.registerPlugins([plugin]);
  }
  (instance as any).__nodeRuntimePluginLoaded = true;
}
