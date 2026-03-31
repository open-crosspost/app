import { oc, z } from "./plugin";
import { SourceModeSchema } from "./types";

export const DevOptionsSchema = z.object({
  host: SourceModeSchema.default("local"),
  ui: SourceModeSchema.default("local"),
  api: SourceModeSchema.default("local"),
  proxy: z.boolean().default(false),
  ssr: z.boolean().default(false),
  port: z.number().optional(),
  interactive: z.boolean().optional(),
});

export const DevResultSchema = z.object({
  status: z.enum(["started", "error"]),
  description: z.string(),
  processes: z.array(z.string()),
});

export const StartOptionsSchema = z.object({
  port: z.number().optional(),
  interactive: z.boolean().optional(),
  account: z.string().optional(),
  domain: z.string().optional(),
});

export const StartResultSchema = z.object({
  status: z.enum(["running", "error"]),
  url: z.string(),
});

export const BuildOptionsSchema = z.object({
  packages: z.string().default("all"),
  force: z.boolean().default(false),
  deploy: z.boolean().default(false),
});

export const BuildResultSchema = z.object({
  status: z.enum(["success", "error"]),
  built: z.array(z.string()),
  skipped: z.array(z.string()).optional(),
  deployed: z.boolean().optional(),
});

export const bosContract = oc.router({
  dev: oc.route({ method: "POST", path: "/dev" }).input(DevOptionsSchema).output(DevResultSchema),
  start: oc
    .route({ method: "POST", path: "/start" })
    .input(StartOptionsSchema)
    .output(StartResultSchema),
  build: oc
    .route({ method: "POST", path: "/build" })
    .input(BuildOptionsSchema)
    .output(BuildResultSchema),
});

export type DevOptions = z.infer<typeof DevOptionsSchema>;
export type StartOptions = z.infer<typeof StartOptionsSchema>;
export type BuildOptions = z.infer<typeof BuildOptionsSchema>;
