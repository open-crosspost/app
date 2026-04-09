/// <reference types="@rsbuild/core/types" />
/// <reference types="@proj-airi/unplugin-drizzle-orm-migrations/types" />

interface ImportMetaEnv {
  readonly MODE: "development" | "production";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};

declare global {
  // Temporary compatibility for legacy tests during apiClient refactor.
  // Runtime code no longer reads this.
  // eslint-disable-next-line no-var
  var $apiClient: unknown;
}
