import { createBrowserHistory } from "@tanstack/react-router";
import { createUiClientRuntime } from "everything-dev/ui/client";
import { getRuntimeBasePath } from "./app";
import { routeTree } from "./routeTree.gen";
import "./styles.css";
import type { CreateRouterOptions } from "./types";

export type {
  ClientRuntimeConfig,
  CreateRouterOptions,
  RouterContext,
  RouterModule,
} from "./types";

const runtime = createUiClientRuntime({ routeTree });

type UiCreateRouterOptions = CreateRouterOptions & { basepath?: string };

export function createRouter(opts: UiCreateRouterOptions = {}) {
  const basepath = opts.basepath;

  return runtime.createRouter({
    ...opts,
    basepath: basepath ?? getRuntimeBasePath(opts.context?.runtimeConfig),
    history: opts.history ?? createBrowserHistory(),
    context: {
      ...opts.context,
      assetsUrl: opts.context?.assetsUrl ?? "",
      runtimeConfig: opts.context?.runtimeConfig,
    },
  } as Parameters<typeof runtime.createRouter>[0]);
}

export { routeTree };

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>["router"];
  }
}
