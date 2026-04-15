export const PLUGIN_VERSION = "2.0.0";

export const SHARE_CONFIG = {
  singleton: true,
  requiredVersion: false,
  strictVersion: false,
  eager: false,
} as const;

export const MF_SHARED_DEPS = {
  "every-plugin": {
    version: PLUGIN_VERSION,
    shareConfig: SHARE_CONFIG,
  },
  effect: {
    version: "^3.21.0",
    shareConfig: SHARE_CONFIG,
  },
  zod: {
    version: "^4.3.6",
    shareConfig: SHARE_CONFIG,
  },
} as const;

export type SharedDepName = keyof typeof MF_SHARED_DEPS;
