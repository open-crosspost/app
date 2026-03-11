/// <reference types="@rsbuild/core/types" />
/// <reference types="@proj-airi/unplugin-drizzle-orm-migrations/types" />

interface ImportMetaEnv {
  readonly MODE: "development" | "production";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "virtual:drizzle-migrations.sql" {
  const migrations: { default: Array<{ sql: string[]; name: string }> };
  export default migrations;
}
