import { QueryClient } from "@tanstack/react-query";
import { createBrowserHistory, createRouter as createTanStackRouter } from "@tanstack/react-router";
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

export function createRouter(opts: CreateRouterOptions = {}) {
  const queryClient =
    opts.context?.queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000,
          gcTime: 30 * 60 * 1000,
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    });
  const history = opts.history ?? createBrowserHistory();

  const router = createTanStackRouter({
    routeTree,
    history,
    basepath: opts.basepath ?? getRuntimeBasePath(opts.context?.runtimeConfig),
    context: {
      queryClient,
      assetsUrl: opts.context?.assetsUrl ?? "",
      runtimeConfig: opts.context?.runtimeConfig,
      session: opts.context?.session,
    },
    defaultPreload: "intent",
    scrollRestoration: true,
    defaultStructuralSharing: true,
    defaultPreloadStaleTime: 0,
    defaultPendingMinMs: 0,
  });

  return { router, queryClient };
}

export { routeTree };

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>["router"];
  }
}
