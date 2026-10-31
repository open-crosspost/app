/**
 * KEEP: mirrors the campaign ids in ui/src/lib/campaigns.ts. The campaign
 * definitions live client-side; the server only needs the id registry to
 * validate campaign.completed emissions. Add new campaign ids to both.
 */
const CAMPAIGN_IDS = ["gm"] as const;

export type CampaignId = (typeof CAMPAIGN_IDS)[number];

export const isKnownCampaign = (campaignId: string): campaignId is CampaignId =>
  (CAMPAIGN_IDS as readonly string[]).includes(campaignId);
