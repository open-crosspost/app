import { dehydrate, hydrate, QueryClient } from "@tanstack/react-query";
import type { AnyRoute, AnyRouter } from "@tanstack/react-router";
import { createBrowserHistory, createRouter as createTanStackRouter } from "@tanstack/react-router";
import type { ClientRuntimeConfig } from "../types";
import type { UiRuntimeComponents } from "./app";
import type { CreateRouterOptions } from "./types";

export interface CreateUiClientRuntimeOptions {
  routeTree: AnyRoute;
  components?: UiRuntimeComponents;
  resolveBasepath?: (
    context?: Partial<{ runtimeConfig?: Partial<ClientRuntimeConfig> }>,
  ) => string | undefined;
}

export interface UiClientRuntimeModule {
  createRouter: (opts?: CreateRouterOptions) => { router: AnyRouter; queryClient: QueryClient };
  routeTree: AnyRoute;
}

function defaultErrorComponent({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-4">Oops!</h1>
        <p className="text-muted-foreground mb-4">Something went wrong</p>
        <details className="text-sm text-muted-foreground bg-muted p-4 rounded mb-8">
          <summary className="cursor-pointer">Error Details</summary>
          <pre className="mt-2 whitespace-pre-wrap text-left">{error.message}</pre>
        </details>
      </div>
    </div>
  );
}

function defaultNotFoundComponent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-foreground">Not Found</h1>
        <p className="mt-2 text-muted-foreground">The requested page could not be found.</p>
      </div>
    </div>
  );
}

function defaultPendingComponent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  );
}

export function createUiClientRuntime(
  options: CreateUiClientRuntimeOptions,
): UiClientRuntimeModule {
  const createRouter = (opts: CreateRouterOptions = {}) => {
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
      routeTree: options.routeTree,
      history,
      basepath: opts.basepath ?? options.resolveBasepath?.(opts.context),
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
      defaultErrorComponent: options.components?.ErrorComponent ?? defaultErrorComponent,
      defaultNotFoundComponent: options.components?.NotFoundComponent ?? defaultNotFoundComponent,
      defaultPendingComponent: options.components?.PendingComponent ?? defaultPendingComponent,
      defaultPendingMinMs: 0,
      dehydrate: () => {
        if (typeof window === "undefined") {
          return { queryClientState: dehydrate(queryClient) };
        }

        return { queryClientState: {} };
      },
      hydrate: (dehydrated: { queryClientState?: unknown }) => {
        if (typeof window !== "undefined" && dehydrated?.queryClientState) {
          hydrate(queryClient, dehydrated.queryClientState);
        }
      },
    });

    return { router, queryClient };
  };

  return { createRouter, routeTree: options.routeTree };
}
