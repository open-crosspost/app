import type { QueryClient } from "@tanstack/react-query";
import type { AnyRouteMatch, AnyRouter, RouterHistory } from "@tanstack/react-router";
import type { ClientRuntimeConfig } from "../types";

export interface RouterContext {
  queryClient: QueryClient;
  assetsUrl: string;
  runtimeConfig?: Partial<ClientRuntimeConfig>;
  session?: unknown;
}

export interface RouterContextWithApi<TApiClient = unknown> extends RouterContext {
  apiClient?: TApiClient;
}

export interface CreateRouterOptions<TApiClient = unknown> {
  history?: RouterHistory;
  context?: Partial<RouterContextWithApi<TApiClient>>;
  basepath?: string;
}

export type HeadMeta = NonNullable<AnyRouteMatch["meta"]>[number];
export type HeadLink = NonNullable<AnyRouteMatch["links"]>[number];
export type HeadScript = NonNullable<AnyRouteMatch["headScripts"]>[number];

export interface HeadData {
  meta: HeadMeta[];
  links: HeadLink[];
  scripts: HeadScript[];
}

export interface RenderOptions {
  assetsUrl: string;
  runtimeConfig: Partial<ClientRuntimeConfig>;
  basepath?: string;
  session?: unknown;
}

export interface RenderOptionsWithApi<TApiClient = unknown> extends RenderOptions {
  apiClient: TApiClient;
}

export interface RenderResult {
  stream: ReadableStream;
  statusCode: number;
  headers: Headers;
}

export interface RouterModule<TApiClient = unknown> {
  createRouter: (opts?: CreateRouterOptions<TApiClient>) => {
    router: AnyRouter;
    queryClient: QueryClient;
  };
  getRouteHead: (
    pathname: string,
    context?: Partial<RouterContextWithApi<TApiClient>>,
  ) => Promise<HeadData>;
  renderToStream: (
    request: Request,
    options: RenderOptionsWithApi<TApiClient>,
  ) => Promise<RenderResult>;
}
