import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabaseDriver, type DatabaseDriver } from "@/db";
import { CampaignRepository } from "@/social/campaign-repository";
import type { CreateCampaign } from "@/social/types";

const gmCampaign: CreateCampaign = {
  id: "gm",
  name: "gm campaign",
  description: "Say gm every day.",
  actions: [
    {
      id: "gm",
      label: "gm",
      kind: "post",
      text: "gm",
      destinations: [
        { id: "near-social", label: "Near Social", enabled: true },
        { id: "twitter", label: "X", enabled: true },
      ],
    },
  ],
};

describe("CampaignRepository", () => {
  let driver: DatabaseDriver;
  let repository: CampaignRepository;

  beforeAll(async () => {
    driver = await createDatabaseDriver(":memory:");
    repository = new CampaignRepository(driver.db);
    await repository.ensureSchema();
  });

  afterAll(async () => {
    await driver.close();
  });

  it("round-trips create → get → list for campaigns and participants", async () => {
    repository = new CampaignRepository(driver.db);

    const created = await repository.create("owner-1", gmCampaign);
    expect(created.status).toBe("active");
    expect(created.actions[0]?.text).toBe("gm");
    expect(created.actions[0]?.destinations).toHaveLength(2);

    const fetched = await repository.get("gm");
    expect(fetched?.name).toBe("gm campaign");
    expect(fetched?.description).toBe("Say gm every day.");

    const activeList = await repository.listActive();
    expect(activeList.map((campaign) => campaign.id)).toContain("gm");
  });

  it("rejects a duplicate campaign id", async () => {
    let conflict: unknown;
    try {
      await repository.create("owner-2", gmCampaign);
    } catch (error) {
      conflict = error;
    }
    expect(conflict).toBeInstanceOf(Error);
  });

  it("applies partial updates and keeps identity", async () => {
    const updated = await repository.update("gm", { description: "Updated copy." });
    expect(updated?.description).toBe("Updated copy.");
    expect(updated?.name).toBe("gm campaign");
    if (updated) {
      expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(Date.parse(updated.createdAt));
    }

    const unchanged = await repository.update("gm", {});
    expect(unchanged?.description).toBe("Updated copy.");
  });

  it("gates participation modes and upserts participants", async () => {
    await repository.upsertParticipant("gm", "user-1", "manual");
    await repository.upsertParticipant("gm", "user-1", "auto");

    const mode = await repository.getParticipant("gm", "user-1");
    expect(mode).toBe("auto");

    const participation = await repository.listParticipantsForUser("user-1");
    expect(participation).toEqual([{ campaignId: "gm", mode: "auto" }]);
  });

  it("deactivation removes a campaign from the active list but keeps the row", async () => {
    const removed = await repository.deactivate("gm");
    expect(removed?.status).toBe("inactive");

    const stillThere = await repository.get("gm");
    expect(stillThere).not.toBeNull();

    const activeList = await repository.listActive();
    expect(activeList.map((campaign) => campaign.id)).not.toContain("gm");
  });

  describe("daily seeds", () => {
    it("records a seed, merges legs across calls, and reads today's seed", async () => {
      const date = "2026-11-01";

      const seeded = await repository.upsertSeed("gm", date, { nearPostId: "1759140000000" });
      expect(seeded.nearPostId).toBe("1759140000000");
      expect(seeded.xPostId).toBeNull();

      const merged = await repository.upsertSeed("gm", date, { xPostId: "1852180000000" });
      expect(merged.nearPostId).toBe("1759140000000");
      expect(merged.xPostId).toBe("1852180000000");

      const reSaved = await repository.upsertSeed("gm", date, { nearPostId: "1759140000999" });
      expect(reSaved.nearPostId).toBe("1759140000999");
      expect(reSaved.xPostId).toBe("1852180000000");

      const read = await repository.getSeed("gm", date);
      expect(read?.createdAt).toBeTruthy();

      expect(await repository.getSeed("gm", "2026-11-02")).toBeNull();
    });
  });
});
