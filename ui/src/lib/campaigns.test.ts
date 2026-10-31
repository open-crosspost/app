import { describe, expect, it } from "vitest";
import {
  type Campaign,
  campaignDestinations,
  campaignPrefillPosts,
  getCampaign,
  listCampaigns,
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
