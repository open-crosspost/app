import { oc, z } from "./sdk";
import { BosConfigSchema, SourceModeSchema } from "./types";

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

export const ConfigResultSchema = z.object({
  config: BosConfigSchema.nullable(),
  packages: z.array(z.string()),
  remotes: z.array(z.string()),
});

export const PublishOptionsSchema = z.object({
  deploy: z.boolean().default(false),
  dryRun: z.boolean().default(false),
  packages: z.string().default("all"),
  network: z.enum(["mainnet", "testnet"]).optional(),
  privateKey: z.string().optional(),
});

export const PublishResultSchema = z.object({
  status: z.enum(["published", "error", "dry-run"]),
  registryUrl: z.string(),
  txHash: z.string().optional(),
  error: z.string().optional(),
  built: z.array(z.string()).optional(),
  skipped: z.array(z.string()).optional(),
});

export const KeyPublishOptionsSchema = z.object({
  allowance: z.string().default("0.25NEAR"),
});

export const KeyPublishResultSchema = z.object({
  status: z.enum(["published", "error"]),
  account: z.string(),
  network: z.enum(["mainnet", "testnet"]),
  contract: z.string(),
  allowance: z.string(),
  functionNames: z.array(z.string()),
  publicKey: z.string().optional(),
  privateKey: z.string().optional(),
  error: z.string().optional(),
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
  config: oc.route({ method: "GET", path: "/config" }).output(ConfigResultSchema),
  publish: oc
    .route({ method: "POST", path: "/publish" })
    .input(PublishOptionsSchema)
    .output(PublishResultSchema),
  keyPublish: oc
    .route({ method: "POST", path: "/key/publish" })
    .input(KeyPublishOptionsSchema)
    .output(KeyPublishResultSchema),
});

export type DevOptions = z.infer<typeof DevOptionsSchema>;
export type StartOptions = z.infer<typeof StartOptionsSchema>;
export type BuildOptions = z.infer<typeof BuildOptionsSchema>;
export type BosConfigResult = z.infer<typeof ConfigResultSchema>;
export type PublishOptions = z.infer<typeof PublishOptionsSchema>;
export type KeyPublishOptions = z.infer<typeof KeyPublishOptionsSchema>;
export type KeyPublishResult = z.infer<typeof KeyPublishResultSchema>;
