import { createRouter as createTanStackRouter, type CreateRouterOptions } from "@tanstack/react-router";

/**
 * Authored router seam — mirrors `everything-dev/ui/router-client`.
 * Wraps TanStack Router's createRouter so child apps can adopt the
 * authored-seam pattern (defaultRouteTree, composed manifest tree) without
 * depending on a newer everything-dev release.
 */
export function createCoreRouter<TApiClient, TSession, TRouteTree extends object>(
  opts: Omit<CreateRouterOptions<TApiClient, TSession>, "routeTree"> & {
    defaultRouteTree?: TRouteTree;
  }
) {
  return createTanStackRouter({
    ...opts,
    ...(opts.defaultRouteTree ? { routeTree: opts.defaultRouteTree } : {}),
  });
}
