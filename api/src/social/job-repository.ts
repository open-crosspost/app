import { randomUUID } from "node:crypto";
import { and, desc, eq, lte, type SQL } from "drizzle-orm";
import type { Database } from "../db";
import { jobRuns, jobSpecs } from "../db/schema";
import {
  type JobRun,
  type JobRunListQuery,
  JobRunOutputSchema,
  type JobRunReport,
  type JobSpec,
  type JobSpecCreate,
  JobSpecOutputSchema,
  JobSpecScheduleSchema,
} from "./types";

const RUN_STATUS = new Set([
  "pending",
  "executing",
  "completed",
  "failed",
  "needs_signature",
  "cancelled",
]);

function specRowColumns() {
  return {
    id: jobSpecs.id,
    userId: jobSpecs.userId,
    kind: jobSpecs.kind,
    campaignId: jobSpecs.campaignId,
    actionId: jobSpecs.actionId,
    postsJson: jobSpecs.postsJson,
    targetsJson: jobSpecs.targetsJson,
    scheduleJson: jobSpecs.scheduleJson,
    status: jobSpecs.status,
    createdAt: jobSpecs.createdAt,
    updatedAt: jobSpecs.updatedAt,
  };
}

function mapSpecRow(row: {
  id: string;
  userId: string;
  kind: string;
  campaignId: string | null;
  actionId: string | null;
  postsJson: string | null;
  targetsJson: string;
  scheduleJson: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}): JobSpec {
  const parsedTargets = JobSpecOutputSchema.shape.targets.safeParse(JSON.parse(row.targetsJson));
  const parsedSchedule = JobSpecScheduleSchema.safeParse(JSON.parse(row.scheduleJson));

  if (!parsedTargets.success || !parsedSchedule.success) {
    throw new Error(`Job spec ${row.id} has a corrupt payload column`);
  }

  const parsed = JobSpecOutputSchema.safeParse({
    id: row.id,
    userId: row.userId,
    kind: row.kind,
    campaignId: row.campaignId,
    actionId: row.actionId,
    posts: row.postsJson ? JSON.parse(row.postsJson) : null,
    targets: parsedTargets.data,
    schedule: parsedSchedule.data,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });

  if (!parsed.success) {
    throw new Error(`Job spec ${row.id} failed schema validation`);
  }

  return parsed.data as JobSpec;
}

function mapRunRow(row: {
  id: string;
  specId: string;
  userId: string;
  kind: string;
  campaignId: string | null;
  postsJson: string | null;
  targetsJson: string;
  scheduledFor: string;
  status: string;
  resultJson: string | null;
  error: string | null;
  executedAt: string | null;
  createdAt: string;
}): JobRun {
  return JobRunOutputSchema.parse({
    id: row.id,
    specId: row.specId,
    kind: row.kind,
    campaignId: row.campaignId,
    posts: row.postsJson ? JSON.parse(row.postsJson) : null,
    targets: JSON.parse(row.targetsJson),
    scheduledFor: row.scheduledFor,
    status: row.status,
    result: row.resultJson ? JSON.parse(row.resultJson) : null,
    error: row.error,
    executedAt: row.executedAt,
    createdAt: row.createdAt,
  });
}

function runRowColumns() {
  return {
    id: jobRuns.id,
    specId: jobRuns.specId,
    userId: jobRuns.userId,
    kind: jobRuns.kind,
    campaignId: jobRuns.campaignId,
    postsJson: jobRuns.postsJson,
    targetsJson: jobRuns.targetsJson,
    scheduledFor: jobRuns.scheduledFor,
    status: jobRuns.status,
    resultJson: jobRuns.resultJson,
    error: jobRuns.error,
    executedAt: jobRuns.executedAt,
    createdAt: jobRuns.createdAt,
  };
}

export class JobRepository {
  constructor(private readonly db: Database) {}

  async ensureSchema(): Promise<void> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS job_specs (
        id text PRIMARY KEY,
        user_id text NOT NULL,
        kind text NOT NULL,
        campaign_id text,
        action_id text,
        posts_json text,
        targets_json text NOT NULL,
        schedule_json text NOT NULL,
        status text NOT NULL DEFAULT 'active',
        created_at text NOT NULL,
        updated_at text NOT NULL
      )
    `);

    await this.db.execute(`
      CREATE INDEX IF NOT EXISTS job_specs_user_idx
      ON job_specs (user_id)
    `);

    await this.db.execute(`
      CREATE INDEX IF NOT EXISTS job_specs_kind_idx
      ON job_specs (kind)
    `);

    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS job_runs (
        id text PRIMARY KEY,
        spec_id text NOT NULL,
        user_id text NOT NULL,
        kind text NOT NULL,
        campaign_id text,
        posts_json text,
        targets_json text NOT NULL,
        scheduled_for text NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        result_json text,
        error text,
        executed_at text,
        created_at text NOT NULL
      )
    `);

    await this.db.execute(`
      CREATE INDEX IF NOT EXISTS job_runs_scheduled_status_idx
      ON job_runs (scheduled_for, status)
    `);

    await this.db.execute(`
      CREATE INDEX IF NOT EXISTS job_runs_spec_idx
      ON job_runs (spec_id)
    `);

    await this.db.execute(`
      CREATE INDEX IF NOT EXISTS job_runs_user_idx
      ON job_runs (user_id)
    `);
  }

  async createSpec(userId: string, input: JobSpecCreate): Promise<JobSpec> {
    const now = new Date().toISOString();
    const id = randomUUID();

    const inserted = await this.db
      .insert(jobSpecs)
      .values({
        id,
        userId,
        kind: input.kind,
        campaignId: input.campaignId ?? null,
        actionId: input.kind === "campaign" ? (input.campaignId ? "default" : null) : null,
        postsJson: input.kind === "scheduled" && input.posts ? JSON.stringify(input.posts) : null,
        targetsJson: JSON.stringify(input.targets),
        scheduleJson: JSON.stringify(input.schedule),
        status: "active",
        createdAt: now,
        updatedAt: now,
      })
      .returning(specRowColumns());

    const spec = mapSpecRow(inserted[0]!);

    if (input.schedule.mode === "once") {
      await this.createRun(spec.id, userId, spec.kind, spec.campaignId, input.schedule.at, {
        posts: spec.posts ?? undefined,
        targets: spec.targets,
      });
    }

    return spec;
  }

  async getSpec(specId: string): Promise<JobSpec | null> {
    const rows = await this.db
      .select(specRowColumns())
      .from(jobSpecs)
      .where(eq(jobSpecs.id, specId))
      .limit(1);
    return rows[0] ? mapSpecRow(rows[0]) : null;
  }

  async ownerOfSpec(specId: string): Promise<string | null> {
    const rows = await this.db
      .select({ userId: jobSpecs.userId })
      .from(jobSpecs)
      .where(eq(jobSpecs.id, specId))
      .limit(1);
    return rows[0]?.userId ?? null;
  }

  async listSpecs(userId: string): Promise<JobSpec[]> {
    const rows = await this.db
      .select(specRowColumns())
      .from(jobSpecs)
      .where(eq(jobSpecs.userId, userId))
      .orderBy(desc(jobSpecs.createdAt));
    return rows
      .map((row) => {
        try {
          return mapSpecRow(row);
        } catch {
          return null;
        }
      })
      .filter((spec): spec is JobSpec => spec !== null);
  }

  async updateSpecStatus(
    userId: string,
    specId: string,
    status: "active" | "paused" | "cancelled",
  ): Promise<JobSpec | null> {
    const owner = await this.ownerOfSpec(specId);
    if (!owner || owner !== userId) {
      return null;
    }

    const updated = await this.db
      .update(jobSpecs)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(and(eq(jobSpecs.id, specId), eq(jobSpecs.userId, userId)))
      .returning(specRowColumns());

    const spec = updated[0] ? mapSpecRow(updated[0]) : null;

    if (spec && status === "cancelled") {
      await this.cancelPendingRuns(specId);
    }

    return spec;
  }

  async cancelPendingRuns(specId: string): Promise<void> {
    await this.db
      .update(jobRuns)
      .set({ status: "cancelled" })
      .where(and(eq(jobRuns.specId, specId), eq(jobRuns.status, "pending")));
  }

  async createRun(
    specId: string,
    userId: string,
    kind: string,
    campaignId: string | null,
    scheduledFor: string,
    content?: { posts?: unknown; targets: unknown },
    status: string = "pending",
  ): Promise<JobRun> {
    if (!RUN_STATUS.has(status)) {
      throw new Error(`Unknown run status ${status}`);
    }

    const inserted = await this.db
      .insert(jobRuns)
      .values({
        id: randomUUID(),
        specId,
        userId,
        kind,
        campaignId,
        postsJson: content?.posts ? JSON.stringify(content.posts) : null,
        targetsJson: content ? JSON.stringify(content.targets) : "[]",
        scheduledFor,
        status,
        createdAt: new Date().toISOString(),
      })
      .returning(runRowColumns());

    return mapRunRow(inserted[0]!);
  }

  async listRuns(userId: string, query?: JobRunListQuery): Promise<JobRun[]> {
    const conditions: SQL[] = [eq(jobRuns.userId, userId)];

    if (query?.specId) {
      conditions.push(eq(jobRuns.specId, query.specId));
    }
    if (query?.status) {
      conditions.push(eq(jobRuns.status, query.status));
    }
    if (query?.due) {
      conditions.push(lte(jobRuns.scheduledFor, new Date().toISOString()));
    }

    const offset = query?.offset ?? 0;
    const limit = query?.limit ?? 50;

    const rows = query?.due
      ? await this.db
          .select(runRowColumns())
          .from(jobRuns)
          .where(and(...conditions))
          .orderBy(jobRuns.scheduledFor)
          .limit(limit)
          .offset(offset)
      : await this.db
          .select(runRowColumns())
          .from(jobRuns)
          .where(and(...conditions))
          .orderBy(desc(jobRuns.scheduledFor))
          .limit(limit)
          .offset(offset);

    return rows
      .map((row) => {
        try {
          return mapRunRow(row);
        } catch {
          return null;
        }
      })
      .filter((run): run is JobRun => run !== null);
  }

  async claimRun(
    userId: string,
    runId: string,
    expectedStatus: "pending" | "needs_signature",
  ): Promise<JobRun | null> {
    if (!RUN_STATUS.has(expectedStatus)) {
      throw new Error(`Unknown run status ${expectedStatus}`);
    }

    const claimed = await this.db
      .update(jobRuns)
      .set({ status: "executing" })
      .where(
        and(eq(jobRuns.id, runId), eq(jobRuns.userId, userId), eq(jobRuns.status, expectedStatus)),
      )
      .returning(runRowColumns());

    return claimed[0] ? mapRunRow(claimed[0]) : null;
  }

  async reportRun(userId: string, runId: string, report: JobRunReport): Promise<JobRun | null> {
    const reported = await this.db
      .update(jobRuns)
      .set({
        status: report.status,
        resultJson: report.result ? JSON.stringify(report.result) : null,
        error: report.error ?? null,
        executedAt: new Date().toISOString(),
      })
      .where(
        and(eq(jobRuns.id, runId), eq(jobRuns.userId, userId), eq(jobRuns.status, "executing")),
      )
      .returning(runRowColumns());

    return reported[0] ? mapRunRow(reported[0]) : null;
  }
}
