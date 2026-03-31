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

const runtime = createUiClientRuntime({
  routeTree,
  resolveBasepath: (context) => getRuntimeBasePath(context?.runtimeConfig),
});

export function createRouter(opts: CreateRouterOptions = {}) {
  return runtime.createRouter({
    ...opts,
    history: opts.history ?? createBrowserHistory(),
    context: {
      ...opts.context,
      assetsUrl: opts.context?.assetsUrl ?? "",
      runtimeConfig: opts.context?.runtimeConfig,
    },
  });
}

export { routeTree };

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>["router"];
  }
}
