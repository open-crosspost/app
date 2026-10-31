import type { AccountPost } from "@crosspost/plugin/types";
import { Platform, type PlatformName } from "@crosspost/plugin/types";
import type { EditorContent } from "@/store/drafts-store";

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
          { id: "twitter", label: "X", enabled: true },
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

export const CAMPAIGN_DESTINATION_PLATFORM: Record<CampaignDestinationId, PlatformName> = {
  twitter: Platform.TWITTER,
  "near-social": "Near Social" as PlatformName,
};

export function campaignPrefillPosts(campaign: Campaign): EditorContent[] {
  return campaign.actions
    .filter((action) => action.kind === "post")
    .map((action) => ({ text: action.text, media: [] }));
}

export function campaignDestinations(campaign: Campaign): CampaignDestinationId[] {
  return campaign.actions
    .flatMap((action) => action.destinations)
    .filter((destination) => destination.enabled)
    .map((destination) => destination.id);
}

export function postsMatchingCampaign(posts: AccountPost[], campaign: Campaign): AccountPost[] {
  const texts = campaign.actions
    .filter((action) => action.kind === "post")
    .map((action) => action.text.trim().toLowerCase())
    .filter(Boolean);
  if (texts.length === 0) return [];
  return posts.filter((post) => {
    const content = (post.content || "").trim().toLowerCase();
    return content !== "" && texts.includes(content);
  });
}
