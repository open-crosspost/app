import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabaseDriver, type DatabaseDriver } from "@/db";
import { CampaignRepository } from "@/social/campaign-repository";
import { JobRepository } from "@/social/job-repository";
import { JobScheduler } from "@/social/scheduler";
import type { CreateCampaign, JobSpecCreate } from "@/social/types";

const gmCampaign: CreateCampaign = {
  id: "gm",
  name: "gm campaign",
  description: "",
  actions: [
    {
      id: "gm",
      label: "gm",
      kind: "post" as const,
      text: "gm",
      destinations: [
        { id: "twitter", label: "X", enabled: true },
        { id: "near-social", label: "Near Social", enabled: true },
      ],
    },
  ],
};

function connectorMock(results: Array<Record<string, unknown>>) {
  const calls: unknown[] = [];
  return {
    calls,
    fn: async (args: unknown) => {
      calls.push(args);
      const next = results[calls.length - 1] ?? {};
      return {
        callId: `call-${calls.length}`,
        status: "completed",
        output: next.output ?? {
          success: true,
          output: { tweet_id: "1", url: "https://x.com/u/status/1" },
        },
        error: null,
        computeCost: "1001",
        ...next,
      } as never;
    },
  };
}

describe("JobScheduler", () => {
  let driver: DatabaseDriver;
  let jobRepository: JobRepository;
  let campaignRepository: CampaignRepository;
  let scheduler: JobScheduler;

  beforeAll(async () => {
    driver = await createDatabaseDriver(":memory:");
    jobRepository = new JobRepository(driver.db);
    campaignRepository = new CampaignRepository(driver.db);
    await campaignRepository.ensureSchema();
    await jobRepository.ensureSchema();
    await campaignRepository.create("owner-1", gmCampaign);
    scheduler = new JobScheduler(jobRepository, campaignRepository);
  });

  afterAll(async () => {
    await driver.close();
  });

  it("does not spawn without today's seed", async () => {
    await jobRepository.createSpec("user-1", campaignSpec("twitter"));
    expect(await scheduler.spawnRuns()).toBe(0);
  });

  it("spawns exactly one jittered run per spec/day once the seed lands", async () => {
    await campaignRepository.upsertSeed("gm", utcToday(), { xPostId: "1852180000000" });

    const first = await scheduler.spawnRuns();
    expect(first).toBe(1);

    const again = await scheduler.spawnRuns();
    expect(again).toBe(0);

    const spec = (await jobRepository.listSpecs("user-1"))[0];
    if (!spec) throw new Error("expected spec");
    const runs = await jobRepository.listRuns("user-1", { specId: spec.id });
    expect(runs).toHaveLength(1);
    expect(runs[0]?.posts?.[0]?.text).toBe("gm");
    expect(runs[0]?.targets[0]?.accountUserId).toBe("x-user-1");

    const scheduled = new Date(runs[0]?.scheduledFor ?? 0).getTime();
    const delaySeconds = (scheduled - Date.now()) / 1000;
    expect(delaySeconds).toBeGreaterThanOrEqual(45);
    expect(delaySeconds).toBeLessThanOrEqual(620);
  });

  it("fires X-only runs server-side through the bridge and records results", async () => {
    await jobRepository.createSpec("user-2", campaignSpec("twitter"));
    await campaignRepository.upsertSeed("gm", utcToday(), { xPostId: "1852180000000" });
    await scheduler.spawnRuns();

    const outbound = connectorMock([]);
    scheduler.attachConnectorCall(outbound.fn);

    const dueNow = await jobRepository.listRunsForExecution(new Date(Date.now() + 15 * 60 * 1000));
    for (const run of dueNow) {
      if (run.userId === "user-2") {
        await driver.db.execute(
          `update job_runs set scheduled_for = '${new Date().toISOString()}' where id = '${run.id}'`,
        );
      }
    }

    const fired = await scheduler.fireDueRuns();
    expect(fired).toBeGreaterThanOrEqual(1);

    const spec = (await jobRepository.listSpecs("user-2"))[0];
    if (!spec) throw new Error("expected spec");
    const runs = await jobRepository.listRuns("user-2", { specId: spec.id });
    const completed = runs.find((run) => run.status === "completed");
    expect(completed).toBeTruthy();
    expect(completed?.result?.url).toBe("https://x.com/u/status/1");
    expect(outbound.calls[0]).toMatchObject({
      operation: "post",
      input: { text: "gm", reply_to: "1852180000000" },
    });
  });

  it("marks runs with non-X targets as needs_signature for browser pickup", async () => {
    await jobRepository.createSpec("user-3", campaignSpec("near-social"));
    await campaignRepository.upsertSeed("gm", utcToday(), { xPostId: "1852180000000" });
    await scheduler.spawnRuns();

    const spec = (await jobRepository.listSpecs("user-3"))[0];
    if (!spec) throw new Error("expected spec");
    for (const run of await jobRepository.listRuns("user-3", { specId: spec.id })) {
      await driver.db.execute(
        `update job_runs set scheduled_for = '${new Date().toISOString()}' where id = '${run.id}'`,
      );
    }

    const outbound = connectorMock([]);
    scheduler.attachConnectorCall(outbound.fn);
    const fired = await scheduler.fireDueRuns();

    const runs = await jobRepository.listRuns("user-3", { specId: spec.id });
    expect(runs[0]?.status).toBe("needs_signature");
    expect(outbound.calls).toHaveLength(0);
    expect(fired).toBeGreaterThanOrEqual(0);
  });

  it("records a failed run when the bridge call errors", async () => {
    await jobRepository.createSpec("user-6", campaignSpec("twitter"));
    await campaignRepository.upsertSeed("gm", utcToday(), { xPostId: "1852180000000" });
    await scheduler.spawnRuns();

    scheduler.attachConnectorCall(async () => {
      throw new Error("XPOST gate refused: balance too low");
    });

    const spec = (await jobRepository.listSpecs("user-6"))[0];
    if (!spec) throw new Error("expected spec");
    for (const run of await jobRepository.listRuns("user-6", { specId: spec.id })) {
      await driver.db.execute(
        `update job_runs set scheduled_for = '${new Date().toISOString()}' where id = '${run.id}'`,
      );
    }

    await scheduler.fireDueRuns();
    const runs = await jobRepository.listRuns("user-6", { specId: spec.id });
    expect(runs[0]?.status).toBe("failed");
    expect(runs[0]?.error).toContain("gate refused");
  });
});

function campaignSpec(platform: "twitter" | "near-social"): JobSpecCreate {
  return {
    kind: "campaign",
    campaignId: "gm",
    targets: [
      {
        platform,
        accountUserId: platform === "twitter" ? "x-user-1" : "alice.near",
      },
    ],
    schedule: { mode: "daily" },
  };
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}
