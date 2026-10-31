import { describe, expect, it } from "vitest";
import { type Campaign, getCampaign, listCampaigns } from "./campaigns";

describe("campaigns", () => {
  it("registers the GM campaign with Near Social enabled and X disabled", () => {
    expect(getCampaign("gm")).toMatchObject({
      id: "gm",
      name: "GM Campaign",
      actions: [
        {
          kind: "post",
          text: "GM",
          label: "GM",
          destinations: [
            { id: "near-social", label: "Near Social", enabled: true },
            { id: "twitter", label: "X", enabled: false },
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
            { id: "twitter", label: "X", enabled: false },
          ],
        },
      ],
    };

    const extended = [...listCampaigns(), next];

    expect(extended.map((campaign) => campaign.id)).toEqual(["gm", "gn"]);
    expect(getCampaign("gm")).toBe(gm);
    expect(getCampaign("gm")?.actions[0]?.text).toBe("GM");
    expect(extended[1]?.actions[0]?.text).toBe("GN");
  });
});
