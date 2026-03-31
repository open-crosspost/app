import { TanStackDevtools } from "@tanstack/react-devtools";
import {
  ClientOnly,
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { getBaseStyles, getRuntimeBasePath } from "@/app";
import { type SessionData, sessionQueryOptions } from "@/lib/session";
import type { RouterContext } from "@/types";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context }) => {
    const session = context.session as SessionData | undefined | null;

    return {
      assetsUrl: context.assetsUrl || "",
      runtimeConfig: context.runtimeConfig,
      session,
    };
  },
  loader: async ({ context }) => {
    const { queryClient } = context;
    const session = context.session as SessionData | undefined | null;

    // Pre-populate session cache from SSR data
    if (session && queryClient) {
      queryClient.setQueryData(sessionQueryOptions(session).queryKey, session);
    }

    return {
      assetsUrl: context.assetsUrl || "",
      runtimeConfig: context.runtimeConfig,
      session,
    };
  },
  head: ({ loaderData }) => {
    const assetsUrl = loaderData?.assetsUrl || "";
    const runtimeConfig = loaderData?.runtimeConfig;
    const runtimeBasePath = getRuntimeBasePath(runtimeConfig);
    const siteUrl = runtimeConfig?.hostUrl
      ? `${runtimeConfig.hostUrl}${runtimeBasePath === "/" ? "" : runtimeBasePath}`
      : "";
    const title = "everything.dev";
    const description =
      "Open runtime for apps on NEAR, composed from published config and loaded through a shared host, UI, and API runtime.";
    const siteName = "everything.dev";
    const ogImage = `${assetsUrl}/metadata.png`;

    return {
      meta: [
        { charSet: "utf-8" },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1.0, viewport-fit=cover",
        },
        { title },
        { name: "description", content: description },
        { name: "theme-color", content: "#ffffff" },
        { name: "color-scheme", content: "light dark" },
        { name: "application-name", content: siteName },
        { name: "mobile-web-app-capable", content: "yes" },
        {
          name: "apple-mobile-web-app-status-bar-style",
          content: "black-translucent",
        },
        { name: "format-detection", content: "telephone=no" },
        { name: "robots", content: "index, follow" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:image", content: ogImage },
        { property: "og:site_name", content: siteName },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: ogImage },
        ...(siteUrl ? [{ property: "og:url", content: siteUrl }] : []),
      ],
      links: [
        { rel: "stylesheet", href: `${assetsUrl}/static/css/async/style.css` },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossOrigin: "anonymous",
        },
        { rel: "icon", type: "image/x-icon", href: `${assetsUrl}/favicon.ico` },
        { rel: "icon", type: "image/svg+xml", href: `${assetsUrl}/icon.svg` },
        {
          rel: "apple-touch-icon",
          sizes: "180x180",
          href: `${assetsUrl}/apple-touch-icon.png`,
        },
        { rel: "manifest", href: `${assetsUrl}/manifest.json` },
        ...(siteUrl ? [{ rel: "canonical", href: siteUrl }] : []),
      ],
    };
  },
  component: RootComponent,
});

function RootComponent() {
  const { assetsUrl, runtimeConfig } = Route.useLoaderData();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "everything.dev",
    description:
      "Open runtime for apps on NEAR, composed from published config and loaded through a shared host, UI, and API runtime.",
    url: runtimeConfig?.hostUrl || undefined,
  };

  const hydrateBootstrap = `window.__RUNTIME_CONFIG__ = ${JSON.stringify(runtimeConfig ?? null)};window.addEventListener('load', function handleEverythingDevHydrate() { window.__hydrate?.(); }, { once: true });`;

  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {assetsUrl ? <script src={`${assetsUrl}/remoteEntry.js`} /> : null}
        <script dangerouslySetInnerHTML={{ __html: hydrateBootstrap }} />
        <style dangerouslySetInnerHTML={{ __html: getBaseStyles() }} />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div id="root">
            <Outlet />
          </div>
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
        <Scripts />
        {process.env.NODE_ENV === "development" && (
          <ClientOnly>
            <TanStackDevtools
              config={{ position: "bottom-right" }}
              plugins={[
                {
                  name: "Tanstack Router",
                  render: <TanStackRouterDevtoolsPanel />,
                },
                TanStackQueryDevtools,
              ]}
            />
          </ClientOnly>
        )}
      </body>
    </html>
  );
}
