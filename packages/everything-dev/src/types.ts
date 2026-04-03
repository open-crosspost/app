import { z } from "./plugin";

export const SourceModeSchema = z.enum(["local", "remote"]);
export type SourceMode = z.infer<typeof SourceModeSchema>;

export const SharedDepConfigSchema = z.object({
  version: z.string(),
  requiredVersion: z.string().optional(),
  singleton: z.boolean().optional(),
  eager: z.boolean().optional(),
  strictVersion: z.boolean().optional(),
  shareScope: z.string().optional(),
});
export type SharedDepConfig = z.infer<typeof SharedDepConfigSchema>;

export const SharedConfigSchema = z.object({
  version: z.string(),
  requiredVersion: z.string().optional(),
  singleton: z.boolean().optional(),
  eager: z.boolean().optional(),
  strictVersion: z.boolean().optional(),
  shareScope: z.string().optional(),
});
export type SharedConfig = z.infer<typeof SharedConfigSchema>;

export const FederationEntrySchema = z.object({
  name: z.string(),
  url: z.string(),
  entry: z.string(),
  source: SourceModeSchema,
});
export type FederationEntry = z.infer<typeof FederationEntrySchema>;

export const ApiPluginConfigSchema = z.object({
  name: z.string(),
  development: z.string().optional(),
  production: z.string().optional(),
  proxy: z.string().optional(),
  variables: z.record(z.string(), z.string()).optional(),
  secrets: z.array(z.string()).optional(),
});
export type ApiPluginConfig = z.infer<typeof ApiPluginConfigSchema>;

export const BosPluginRefSchema = z.object({
  extends: z.string().optional(),
  development: z.string().optional(),
  production: z.string().optional(),
  proxy: z.string().optional(),
  variables: z.record(z.string(), z.string()).optional(),
  secrets: z.array(z.string()).optional(),
});
export type BosPluginRef = z.infer<typeof BosPluginRefSchema>;

export const RuntimePluginConfigSchema = z.object({
  name: z.string(),
  url: z.string(),
  entry: z.string(),
  source: SourceModeSchema,
  localPath: z.string().optional(),
  port: z.number().optional(),
  proxy: z.string().optional(),
  variables: z.record(z.string(), z.string()).optional(),
  secrets: z.array(z.string()).optional(),
});
export type RuntimePluginConfig = z.infer<typeof RuntimePluginConfigSchema>;

export const UiConfigSchema = z.object({
  name: z.string(),
  development: z.string().optional(),
  production: z.string().optional(),
  ssr: z.string().optional(),
});
export type UiConfig = z.infer<typeof UiConfigSchema>;

export const HostConfigSchema = z.object({
  development: z.string(),
  production: z.string(),
  secrets: z.array(z.string()).optional(),
});
export type HostConfig = z.infer<typeof HostConfigSchema>;

export const ActiveRuntimeInfoSchema = z.object({
  accountId: z.string(),
  gatewayId: z.string(),
  runtimeBasePath: z.string(),
  canonicalConfigUrl: z.string().nullable(),
  resolvedConfig: z.record(z.string(), z.unknown()).nullable(),
  title: z.string().nullable(),
  hostUrl: z.string().nullable(),
});
export type ActiveRuntimeInfo = z.infer<typeof ActiveRuntimeInfoSchema>;

export const BosConfigSchema = z.object({
  account: z.string(),
  extends: z.string().optional(),
  domain: z.string().optional(),
  repository: z.string().optional(),
  shared: z.record(z.string(), z.record(z.string(), SharedDepConfigSchema)).optional(),
  plugins: z.record(z.string(), BosPluginRefSchema).optional(),
  app: z.object({
    host: HostConfigSchema,
    ui: UiConfigSchema,
    api: ApiPluginConfigSchema,
  }),
});
export type BosConfig = z.infer<typeof BosConfigSchema>;

export const RuntimeConfigSchema = z.object({
  env: z.enum(["development", "production"]),
  account: z.string(),
  domain: z.string().optional(),
  networkId: z.enum(["mainnet", "testnet"]),
  title: z.string().optional(),
  repository: z.string().optional(),
  hostUrl: z.string(),
  shared: z
    .object({
      ui: z.record(z.string(), SharedConfigSchema).optional(),
    })
    .optional(),
  ui: FederationEntrySchema.extend({
    localPath: z.string().optional(),
    port: z.number().optional(),
    ssrUrl: z.string().optional(),
  }),
  api: FederationEntrySchema.extend({
    localPath: z.string().optional(),
    port: z.number().optional(),
    proxy: z.string().optional(),
    variables: z.record(z.string(), z.string()).optional(),
    secrets: z.array(z.string()).optional(),
  }),
  plugins: z.record(z.string(), RuntimePluginConfigSchema).optional(),
});
export type RuntimeConfig = z.infer<typeof RuntimeConfigSchema>;

export const ClientRuntimeConfigSchema = z.object({
  env: z.enum(["development", "production"]),
  account: z.string(),
  networkId: z.enum(["mainnet", "testnet"]),
  hostUrl: z.string().optional(),
  assetsUrl: z.string(),
  apiBase: z.string(),
  rpcBase: z.string(),
  repository: z.string().optional(),
  runtime: ActiveRuntimeInfoSchema.optional(),
  ui: z
    .object({
      name: z.string(),
      url: z.string(),
      entry: z.string(),
    })
    .optional(),
  api: z
    .object({
      name: z.string(),
      url: z.string(),
      entry: z.string(),
    })
    .optional(),
  plugins: z
    .record(
      z.string(),
      z.object({
        name: z.string(),
        url: z.string(),
        entry: z.string(),
      }),
    )
    .optional(),
});
export type ClientRuntimeConfig = z.infer<typeof ClientRuntimeConfigSchema>;
