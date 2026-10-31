import { createFileRoute, Link } from "@tanstack/react-router";
import { listCampaigns } from "@/lib/campaigns";

export const Route = createFileRoute("/_authenticated/campaigns/")({
  component: CampaignsPage,
});

function CampaignsPage() {
  const campaigns = listCampaigns();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <p className="text-muted-foreground">
          Pick a campaign and post from your connected accounts.
        </p>
      </div>
      <div className="space-y-4">
        {campaigns.map((campaign) => (
          <Link
            key={campaign.id}
            to="/campaigns/$campaignId"
            params={{ campaignId: campaign.id }}
            className="block rounded-md border-2 border-primary bg-card p-4 text-card-foreground"
          >
            <h2 className="text-xl font-semibold">{campaign.name}</h2>
            <p className="text-sm text-muted-foreground">{campaign.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
