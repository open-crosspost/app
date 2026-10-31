import { afterAll, describe, expect, it } from "vitest";
import { getPluginClient, teardown } from "../setup";

describe("Activity integration", () => {
  afterAll(async () => {
    await teardown();
  });

  it("records a campaign completion for a known campaign with a NEAR account", async () => {
    const client = await getPluginClient({
      userId: "user-1",
      nearAccountId: "alice.near",
    });

    const result = await client.activity.campaignCompleted({ campaignId: "gm" });

    expect(result.recorded).toBe(true);
  });

  it("rejects unknown campaign ids", async () => {
    const client = await getPluginClient({
      userId: "user-2",
      nearAccountId: "bob.near",
    });

    await expect(
      client.activity.campaignCompleted({ campaignId: "not-a-campaign" }),
    ).rejects.toThrow();
  });
});
