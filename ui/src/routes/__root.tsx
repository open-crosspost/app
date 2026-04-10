// QueryClient import removed "@tanstack/react-query";
import {
  ClientOnly,
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useSearch,
} from "@tanstack/react-router";
import { getRemoteScripts } from "everything-dev/ui/head";
import { getSocialImageMeta } from "everything-dev/ui/metadata";
import { ThemeProvider } from "next-themes";
import React from "react";
import { Toaster } from "sonner";
import { z } from "zod";
import { getBaseStyles, getRuntimeBasePath } from "@/app";
import { type SessionData, sessionQueryOptions } from "@/lib/session";
import type { RouterContext } from "@/types";

export const TanStackRouterDevtools =
  process.env.NODE_ENV === "production"
    ? () => null
    : React.lazy(() =>
        import("@tanstack/router-devtools").then((res) => ({
          default: res.TanStackRouterDevtools,
        })),
      );

export const ReactQueryDevtools =
  process.env.NODE_ENV === "production"
    ? () => null
    : React.lazy(() =>
        import("@tanstack/react-query-devtools").then((d) => ({
          default: d.ReactQueryDevtools,
        })),
      );

const rootSearchSchema = z.object({
  pretend: z.string().optional(),
});

const APP_NAME = "Crosspost";
const APP_DESCRIPTION = "Share your content everywhere at once";
const METADATA_IMAGE_ALT = "Crosspost - Multi-platform posting";

export const Route = createRootRouteWithContext<RouterContext>()({
  validateSearch: (search) => rootSearchSchema.parse(search),
  beforeLoad: async ({ context }) => {
    const session = context.session as SessionData | undefined | null;

    return {
      assetsUrl: context.assetsUrl || "",
      runtimeConfig: context.runtimeConfig,
      apiClient: context.apiClient,
      session,
    };
  },
  loader: async ({ context }) => {
    const { queryClient } = context;
    const session = context.session as SessionData | undefined | null;

    if (session && queryClient) {
      queryClient.setQueryData(sessionQueryOptions(session).queryKey, session);
    }

    return {
      assetsUrl: context.assetsUrl || "",
      runtimeConfig: context.runtimeConfig,
      apiClient: context.apiClient,
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
    const title = APP_NAME;
    const description = APP_DESCRIPTION;
    const siteName = APP_NAME;
    const ogImage = `${assetsUrl}/og-image.png`;

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: APP_NAME,
      description: APP_DESCRIPTION,
      url: runtimeConfig?.hostUrl || undefined,
    };

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
        ...getSocialImageMeta({
          imageUrl: ogImage,
          title,
          description,
          siteName,
          siteUrl,
          alt: METADATA_IMAGE_ALT,
        }),
      ],
      links: [
        { rel: "stylesheet", href: `${assetsUrl}/static/css/async/style.css` },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossOrigin: "anonymous",
        },
        { rel: "shortcut icon", href: `${assetsUrl}/favicon.ico` },
        { rel: "icon", type: "image/svg+xml", href: `${assetsUrl}/icon.svg` },
        { rel: "manifest", href: `${assetsUrl}/manifest.json` },
        ...(siteUrl ? [{ rel: "canonical", href: siteUrl }] : []),
      ],
      scripts: [
        ...getRemoteScripts({
          assetsUrl,
          runtimeConfig: runtimeConfig ?? undefined,
          containerName: "ui",
          hydratePath: "./Hydrate",
        }),
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData),
        },
      ],
    };
  },
  component: RootComponent,
  notFoundComponent: () => <>Not found</>,
});

function RootComponent() {
  const { pretend } = useSearch({ from: Route.id });

  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <HeadContent />
        <style dangerouslySetInnerHTML={{ __html: getBaseStyles() }} />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <div id="root">
            <Outlet />
          </div>
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
        <Scripts />
        {process.env.NODE_ENV === "development" && (
          <ClientOnly>
            <React.Suspense>
              <TanStackRouterDevtools position="bottom-left" />
              <ReactQueryDevtools buttonPosition="bottom-left" />
            </React.Suspense>
          </ClientOnly>
        )}
      </body>
    </html>
  );
}
