import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabaseDriver, type DatabaseDriver } from "@/db";
import { JobRepository } from "@/social/job-repository";

const hourAhead = new Date(Date.now() + 60 * 60 * 1000).toISOString();

function scheduledSpecInput() {
  return {
    kind: "scheduled" as const,
    posts: [{ text: "hello from the past" }],
    targets: [{ platform: "twitter" as const, accountUserId: "x-user-1" }],
    schedule: { mode: "once" as const, at: hourAhead },
  };
}

describe("JobRepository", () => {
  let driver: DatabaseDriver;
  let repository: JobRepository;

  beforeAll(async () => {
    driver = await createDatabaseDriver(":memory:");
    repository = new JobRepository(driver.db);
    await repository.ensureSchema();
  });

  afterAll(async () => {
    await driver.close();
  });

  it("creates a once spec with an immediate pending run", async () => {
    const spec = await repository.createSpec("user-1", scheduledSpecInput());
    expect(spec.status).toBe("active");
    expect(spec.posts?.[0]?.text).toBe("hello from the past");
    expect(spec.targets).toEqual([{ platform: "twitter", accountUserId: "x-user-1" }]);

    const runs = await repository.listRuns("user-1", { specId: spec.id });
    expect(runs).toHaveLength(1);
    expect(runs[0]?.status).toBe("pending");
    expect(runs[0]?.posts?.[0]?.text).toBe("hello from the past");
    expect(runs[0]?.targets[0]?.accountUserId).toBe("x-user-1");
  });

  it("claims runs atomically — exactly one claimant wins", async () => {
    const spec = await repository.createSpec("user-1", scheduledSpecInput());
    const run = await repository.listRuns("user-1", { specId: spec.id }).then((r) => r[0]);
    if (!run) {
      throw new Error("expected the pending run to exist");
    }

    const [first, second] = await Promise.all([
      repository.claimRun("user-1", run.id, "pending"),
      repository.claimRun("user-1", run.id, "pending"),
    ]);

    const claimed = [first, second].filter((result) => result !== null);
    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.status).toBe("executing");
  });

  it("reports results only on executing runs", async () => {
    const spec = await repository.createSpec("user-1", scheduledSpecInput());
    const run = await repository.listRuns("user-1", { specId: spec.id }).then((r) => r[0]);
    if (!run) {
      throw new Error("expected the pending run to exist");
    }
    await repository.claimRun("user-1", run.id, "pending");

    const reported = await repository.reportRun("user-1", run.id, {
      runId: run.id,
      status: "completed",
      result: { url: "https://x.com/i/status/1" },
    });
    expect(reported?.status).toBe("completed");
    expect(reported?.executedAt).toBeTruthy();

    const secondReport = await repository.reportRun("user-1", run.id, {
      runId: run.id,
      status: "failed",
    });
    expect(secondReport).toBeNull();
  });

  it("filters due runs", async () => {
    await repository.createSpec("user-2", scheduledSpecInput());
    const dueList = await repository.listRuns("user-2", { due: true });
    expect(dueList).toHaveLength(0);
  });

  it("cancelling a spec cancels its pending runs", async () => {
    const spec = await repository.createSpec("user-3", scheduledSpecInput());
    const cancelled = await repository.updateSpecStatus("user-3", spec.id, "cancelled");
    expect(cancelled?.status).toBe("cancelled");

    const runs = await repository.listRuns("user-3", { specId: spec.id });
    expect(runs[0]?.status).toBe("cancelled");

    const claimAfterCancel = await repository.claimRun("user-3", runs[0]?.id ?? "", "pending");
    expect(claimAfterCancel).toBeNull();
  });

  it("ignores other users' runs", async () => {
    const spec = await repository.createSpec("user-4", scheduledSpecInput());
    const run = await repository.listRuns("user-4", { specId: spec.id }).then((r) => r[0]);
    if (!run) {
      throw new Error("expected the pending run to exist");
    }
    const strangerClaim = await repository.claimRun("intruder", run.id, "pending");
    expect(strangerClaim).toBeNull();
  });
});
