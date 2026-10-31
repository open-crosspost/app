export type CampaignDestinationId = "near-social" | "twitter";

export type CampaignDestination = {
  id: CampaignDestinationId;
  label: string;
  enabled: boolean;
};

export type CampaignPostAction = {
  id: string;
  label: string;
  kind: "post";
  text: string;
  destinations: CampaignDestination[];
};

export type Campaign = {
  id: string;
  name: string;
  description: string;
  actions: CampaignPostAction[];
};

const campaigns: Campaign[] = [
  {
    id: "gm",
    name: "GM Campaign",
    description: "GM Campaign - Post GM from your account.",
    actions: [
      {
        id: "gm",
        label: "GM",
        kind: "post",
        text: "GM",
        destinations: [
          { id: "near-social", label: "Near Social", enabled: true },
          { id: "twitter", label: "X", enabled: false },
        ],
      },
    ],
  },
];

export function listCampaigns(): Campaign[] {
  return campaigns;
}

export function getCampaign(id: string): Campaign | undefined {
  return campaigns.find((campaign) => campaign.id === id);
}
