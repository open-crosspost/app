import { dehydrate, hydrate, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRouter as createTanStackRouter } from "@tanstack/react-router";
import {
  createRequestHandler,
  RouterServer,
  renderRouterToStream,
} from "@tanstack/react-router/ssr/server";
import { collectHeadData } from "everything-dev/ui/router";
import { routeTree } from "./routeTree.gen";
import type {
  CreateRouterOptions,
  HeadData,
  RenderOptions,
  RenderResult,
  RouterContext,
} from "./types";

export type { CreateRouterOptions, HeadData, RenderOptions, RenderResult, RouterContext };

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

  const history = opts.history ?? createMemoryHistory();

  const router = createTanStackRouter({
    routeTree,
    history,
    basepath: opts.basepath,
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
    defaultErrorComponent,
    defaultNotFoundComponent,
    defaultPendingComponent,
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

const getRouteHead = async (pathname: string, context?: Partial<RouterContext>) => {
  const history = createMemoryHistory({ initialEntries: [pathname] });
  const router = createTanStackRouter({
    routeTree,
    history,
    context: {
      queryClient: undefined as never,
      assetsUrl: context?.assetsUrl ?? "",
      runtimeConfig: context?.runtimeConfig,
      session: context?.session,
    },
  });

  return collectHeadData(router);
};

const renderToStream = async (request: Request, renderOptions: RenderOptions) => {
  const url = new URL(request.url);
  const history = createMemoryHistory({ initialEntries: [url.pathname + url.search] });
  let queryClientRef: QueryClient | null = null;

  const handler = createRequestHandler({
    request,
    createRouter: () => {
      const { router, queryClient } = createRouter({
        history,
        basepath: renderOptions.basepath,
        context: {
          assetsUrl: renderOptions.assetsUrl,
          runtimeConfig: renderOptions.runtimeConfig,
          session: renderOptions.session,
        },
      });
      queryClientRef = queryClient;
      return router;
    },
  });

  const response = await handler(({ request, responseHeaders, router }) =>
    renderRouterToStream({
      request,
      responseHeaders,
      router,
      children: (
        <QueryClientProvider client={queryClientRef!}>
          <RouterServer router={router} />
        </QueryClientProvider>
      ),
    }),
  );

  return {
    stream: response.body!,
    statusCode: response.status,
    headers: response.headers,
  } satisfies RenderResult;
};

const routerModule = {
  createRouter,
  getRouteHead,
  renderToStream,
  routeTree,
} as const;

export default routerModule;
