import type {
  CreateRouterOptions as BaseCreateRouterOptions,
  RenderOptions as BaseRenderOptions,
  RouterContextWithApi as BaseRouterContextWithApi,
} from "everything-dev/ui/types";
import type { ApiClient as BaseApiClient } from "@/lib/api-client";

export type {
  ClientRuntimeInfo,
  ClientRuntimeConfig,
} from "everything-dev/types";
export type {
  HeadData,
  HeadLink,
  HeadMeta,
  HeadScript,
  RenderResult,
  RouterModule,
} from "everything-dev/ui/types";

export type ApiClient = BaseApiClient;

export interface RouterContext extends BaseRouterContextWithApi<ApiClient> {
  apiClient: ApiClient;
}

export interface CreateRouterOptions extends Omit<BaseCreateRouterOptions<ApiClient>, "context"> {
  context: RouterContext;
}

export interface RenderOptions extends Omit<BaseRenderOptions, "runtimeConfig"> {
  runtimeConfig: BaseRenderOptions["runtimeConfig"];
  apiClient: ApiClient;
}
