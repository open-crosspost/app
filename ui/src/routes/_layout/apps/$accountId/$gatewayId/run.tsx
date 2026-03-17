import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button, Card, CardContent } from "@/components";

export const Route = createFileRoute("/_layout/apps/$accountId/$gatewayId/run" as never)({
  head: ({ params }) => ({
    meta: [
      {
        title: `Run ${(params as { accountId: string; gatewayId: string }).gatewayId} | Published Apps | everything.dev`,
      },
      {
        name: "description",
        content: `Launch ${(params as { accountId: string; gatewayId: string }).accountId}/${(params as { accountId: string; gatewayId: string }).gatewayId} through the shared host runtime path.`,
      },
    ],
  }),
  component: GatewayRunPage,
});

function GatewayRunPage() {
  const { accountId, gatewayId } = Route.useParams() as { accountId: string; gatewayId: string };
  const runtimeHref = buildRuntimeHref(accountId, gatewayId);

  useEffect(() => {
    window.location.replace(runtimeHref);
  }, [runtimeHref]);

  return (
    <Card>
      <CardContent className="p-8 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Opening runtime through the shared host...</p>
        <div className="flex justify-center gap-2">
          <Button asChild size="sm">
            <a href={runtimeHref}>continue</a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={buildGatewayHref(accountId, gatewayId)}>inspect runtime</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function buildGatewayHref(accountId: string, gatewayId: string) {
  return `/apps/${encodeURIComponent(accountId)}/${encodeURIComponent(gatewayId)}`;
}

function buildRuntimeHref(accountId: string, gatewayId: string) {
  return `/_runtime/${encodeURIComponent(accountId)}/${encodeURIComponent(gatewayId)}`;
}
