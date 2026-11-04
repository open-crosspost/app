import { Effect } from "effect";
import {
  type DatabaseError,
  type LoadedMigrations,
  loadMigrations as loadSharedMigrations,
  type Migration,
  type MigrationStorage,
  runMigrations,
} from "everything-dev/db";

interface MigrationDatabase {
  execute(query: unknown): Promise<unknown>;
  transaction<T>(fn: (tx: { execute(query: unknown): Promise<unknown> }) => Promise<T>): Promise<T>;
}

interface DriftReport {
  status: "healthy" | "empty" | "untracked-existing-schema" | "drift-safe-repair" | "drift-manual";
  expectedTables: string[];
  missingTables: string[];
  appliedHashes: number;
  localHashes: number;
  storage: MigrationStorage;
}

interface MigrationReport {
  applied: number;
  total: number;
  storage: MigrationStorage;
  schema: string | undefined;
}

export { detectDrift } from "everything-dev/db";
export type { DriftReport, LoadedMigrations, MigrationReport };

export const loadMigrations: Effect.Effect<LoadedMigrations, DatabaseError> = loadSharedMigrations({
  fromDir: import.meta.dirname,
  virtual: () => import("virtual:drizzle-migrations.sql"),
});

/**
 * Thin adapter over the shared `runMigrations` runner (`everything-dev/db`).
 *
 * This file is sync-owned: `bos sync` copies it verbatim into every plugin's
 * `src/db/migrate.ts`, so it must stay workspace-agnostic — the drizzle
 * migrations arrive via the bundler's `virtual:drizzle-migrations.sql` module
 * (declared in each workspace's `src/global.d.ts`) with a disk fallback.
 * Duplicate-DDL tolerance, savepoint handling, and the retryable-SQLSTATE
 * journal-init backoff all live in the shared runner now.
 */
export function migrate(
  db: MigrationDatabase,
  migrations: Migration[],
  storage?: MigrationStorage,
  schemaName?: string,
): Effect.Effect<number, DatabaseError> {
  return Effect.map(
    runMigrations(db, migrations, { journal: storage, schemaName }),
    (report) => report.applied,
  );
}

export type { Migration };
