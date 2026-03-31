import { getAssetsUrl, getRuntimeConfig } from "./remote/runtime";

declare global {
  interface Window {
    __EVERYTHING_DEV_HYDRATE_PROMISE__?: Promise<void>;
  }
}

export async function hydrate() {
  if (window.__EVERYTHING_DEV_HYDRATE_PROMISE__) {
    return window.__EVERYTHING_DEV_HYDRATE_PROMISE__;
  }

  window.__EVERYTHING_DEV_HYDRATE_PROMISE__ = (async () => {
    console.log("[Hydrate] Starting...");

    const runtimeConfig = getRuntimeConfig();
    if (!runtimeConfig) {
      console.error("[Hydrate] No runtime config found");
      return;
    }

    const { QueryClientProvider } = await import("@tanstack/react-query");
    const { createRouter } = await import("./router");

    const { router, queryClient } = createRouter({
      context: {
        assetsUrl: getAssetsUrl(runtimeConfig),
        runtimeConfig,
      },
    });

    if (window.$_TSR) {
      const { hydrateRoot } = await import("react-dom/client");
      const { RouterClient } = await import("@tanstack/react-router/ssr/client");

      console.log("[Hydrate] Calling hydrateRoot...");
      hydrateRoot(
        document,
        <QueryClientProvider client={queryClient}>
          <RouterClient router={router} />
        </QueryClientProvider>,
      );
    } else {
      const { createRoot } = await import("react-dom/client");
      const { RouterProvider } = await import("@tanstack/react-router");

      console.log("[Hydrate] Calling createRoot...");
      createRoot(document).render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>,
      );
    }

    console.log("[Hydrate] Complete!");
  })();

  return window.__EVERYTHING_DEV_HYDRATE_PROMISE__;
}

export default hydrate;
