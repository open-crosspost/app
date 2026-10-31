import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCampaign } from "@/lib/campaigns";

export const Route = createFileRoute("/_authenticated/campaigns/$campaignId")({
  beforeLoad: ({ params }) => {
    if (!getCampaign(params.campaignId)) {
      throw redirect({ to: "/campaigns" });
    }
    throw redirect({ to: "/editor", search: { campaign: params.campaignId } });
  },
});
