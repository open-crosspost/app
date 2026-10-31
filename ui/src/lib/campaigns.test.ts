import { describe, expect, it } from "vitest";
import {
  type Campaign,
  campaignDestinations,
  campaignFromServer,
  campaignPrefillPosts,
  findCampaignById,
  getCampaign,
  listCampaigns,
  mergeCampaigns,
  type ServerCampaign,
} from "./campaigns";

describe("campaigns", () => {
  it("registers the GM campaign with Near Social and X enabled", () => {
    expect(getCampaign("gm")).toMatchObject({
      id: "gm",
      name: "GM Campaign",
      actions: [
        {
          kind: "post",
          text: "gm",
          label: "gm",
          destinations: [
            { id: "near-social", label: "Near Social", enabled: true },
            { id: "twitter", label: "X", enabled: true },
          ],
        },
      ],
    });
  });

  it("keeps GM unchanged when another campaign is added beside it", () => {
    const gm = getCampaign("gm");
    const next: Campaign = {
      id: "gn",
      name: "GN Campaign",
      description: "Say good night.",
      actions: [
        {
          id: "gn",
          label: "GN",
          kind: "post",
          text: "GN",
          destinations: [
            { id: "near-social", label: "Near Social", enabled: true },
            { id: "twitter", label: "X", enabled: true },
          ],
        },
      ],
    };

    const extended = [...listCampaigns(), next];

    expect(extended.map((campaign) => campaign.id)).toEqual(["gm", "gn"]);
    expect(getCampaign("gm")).toBe(gm);
    expect(getCampaign("gm")?.actions[0]?.text).toBe("gm");
    expect(extended[1]?.actions[0]?.text).toBe("GN");
  });
});

describe("campaignPrefillPosts", () => {
  it("prefills editor content with the action text and no media", () => {
    const gm = getCampaign("gm");
    expect(gm).toBeDefined();
    expect(campaignPrefillPosts(gm as Campaign)).toEqual([{ text: "gm", media: [] }]);
  });

  it("returns an empty prefill for a campaign with no actions", () => {
    const empty: Campaign = {
      id: "empty",
      name: "Empty",
      description: "Nothing to post.",
      actions: [],
    };
    expect(campaignPrefillPosts(empty)).toEqual([]);
  });
});

describe("campaignDestinations", () => {
  it("lists only enabled destinations", () => {
    const gm = getCampaign("gm");
    expect(gm).toBeDefined();
    expect(campaignDestinations(gm as Campaign)).toEqual(["near-social", "twitter"]);
  });

  it("skips disabled destinations", () => {
    const campaign: Campaign = {
      id: "partial",
      name: "Partial",
      description: "One destination.",
      actions: [
        {
          id: "p",
          label: "P",
          kind: "post",
          text: "P",
          destinations: [
            { id: "near-social", label: "Near Social", enabled: false },
            { id: "twitter", label: "X", enabled: true },
          ],
        },
      ],
    };
    expect(campaignDestinations(campaign)).toEqual(["twitter"]);
  });
});

describe("server campaign merge", () => {
  const serverRow: ServerCampaign = {
    id: "weekly",
    name: "Weekly prompt",
    description: "A server-created campaign.",
    actions: [
      {
        id: "prompt",
        label: "Prompt",
        kind: "post",
        text: "What are you building?",
        destinations: [{ id: "twitter", label: "X", enabled: true }],
      },
    ],
    status: "active",
    createdAt: "2026-10-31T00:00:00.000Z",
    updatedAt: "2026-10-31T00:00:00.000Z",
  };

  it("campaignFromServer skips inactive rows", () => {
    expect(campaignFromServer(serverRow)).toMatchObject({ id: "weekly" });
    expect(campaignFromServer({ ...serverRow, status: "inactive" })).toBeNull();
  });

  it("merges server campaigns first and dedupes local fallback by id", () => {
    const local = listCampaigns();
    const merged = mergeCampaigns([serverRow], local);
    expect(merged.map((campaign) => campaign.id)).toEqual(["weekly", "gm"]);

    const serverGm = mergeCampaigns([serverRow, { ...serverRow, id: "gm" }], local);
    expect(serverGm.map((campaign) => campaign.id)).toEqual(["weekly", "gm"]);
    expect(serverGm[1]?.name).toBe("Weekly prompt");
  });

  it("keeps the local registry visible when the server has no campaigns yet", () => {
    expect(mergeCampaigns([], listCampaigns()).map((campaign) => campaign.id)).toEqual(["gm"]);
  });

  it("findCampaignById resolves undefined ids safely", () => {
    expect(
      findCampaignById([{ id: "gm", name: "x", description: "", actions: [] }], undefined),
    ).toBeUndefined();
    expect(
      findCampaignById([{ id: "gm", name: "x", description: "", actions: [] }], "gm")?.id,
    ).toBe("gm");
  });
});
