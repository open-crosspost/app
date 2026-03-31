import { createUiRuntime } from "everything-dev/ui/server";
import { routeTree } from "./routeTree.gen";

export { routeTree } from "./routeTree.gen";
export type {
  CreateRouterOptions,
  HeadData,
  RenderOptions,
  RenderResult,
  RouterContext,
} from "./types";

const runtime = createUiRuntime({ routeTree });

export const createRouter = runtime.createRouter;
export const getRouteHead = runtime.getRouteHead;
export const renderToStream = runtime.renderToStream;
