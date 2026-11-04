import { Effect } from "effect";
import {
  detectDrift as detectSharedDrift,
  type LoadedMigrations,
  loadMigrations as loadSharedMigrations,
  type Migration,
  type MigrationStorage,
  runMigrations,
  type DatabaseError as SharedDatabaseError,
} from "everything-dev/db";
import { type Database, DatabaseError } from "./index";

export type { LoadedMigrations, Migration } from "everything-dev/db";

interface DriftReport {
  status: "healthy" | "empty" | "untracked-existing-schema" | "drift-safe-repair" | "drift-manual";
  expectedTables: string[];
  missingTables: string[];
  appliedHashes: number;
  localHashes: number;
  storage: MigrationStorage;
}

export type { DriftReport };

/**
 * Thin adapter over the shared migration runner (`everything-dev/db`).
 *
 * The runner owns duplicate-DDL tolerance, journal-scoped advisory locking,
 * and the virtual-module + disk-fallback loading; this file binds the api
 * workspace's virtual migrations module and maps the shared tagged error
 * onto api's own `DatabaseError` so downstream routes keep one error type.
 */
function toDatabaseError(error: SharedDatabaseError): DatabaseError {
  return new DatabaseError({
    stage: error.stage,
    migrationTag: error.migrationTag,
    statementIndex: error.statementIndex,
    cause: error.cause,
  });
}

export const loadMigrations = (): Effect.Effect<LoadedMigrations, DatabaseError> =>
  Effect.mapError(
    loadSharedMigrations({
      fromDir: import.meta.dirname,
      virtual: () => import("virtual:drizzle-migrations.sql"),
    }),
    toDatabaseError,
  );

export function migrate(
  db: Database,
  migrations: Migration[],
  storage?: MigrationStorage,
): Effect.Effect<number, DatabaseError> {
  return Effect.map(
    Effect.mapError(runMigrations(db, migrations, { journal: storage }), toDatabaseError),
    (report) => report.applied,
  );
}

export function detectDrift(
  db: Database,
  migrations: Migration[],
  storage?: MigrationStorage,
): Effect.Effect<DriftReport, DatabaseError> {
  return Effect.mapError(detectSharedDrift(db, migrations, storage), toDatabaseError);
}
