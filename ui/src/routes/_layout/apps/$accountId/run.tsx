import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import {
  apiClient,
  buildHostRuntimeHref,
  buildPublishedAccountHref,
  buildPublishedGatewayHref,
  getActiveRuntime,
} from "@/app";
import { Button, Card, CardContent } from "@/components";
import { Route as RootRoute } from "../../../__root";

export const Route = createFileRoute("/_layout/apps/$accountId/run" as never)({
  head: ({ params }) => ({
    meta: [
      {
        title: `Run ${(params as { accountId: string }).accountId} | Published Apps | everything.dev`,
      },
      {
        name: "description",
        content: `Resolve a runnable gateway for ${(params as { accountId: string }).accountId}.`,
      },
    ],
  }),
  component: AccountRunPage,
});

function AccountRunPage() {
  const { accountId } = Route.useParams() as { accountId: string };
  const { runtimeConfig } = RootRoute.useLoaderData();
  const activeRuntime = getActiveRuntime(runtimeConfig);
  type RegistryAppsResult = Awaited<ReturnType<typeof apiClient.getRegistryAppsByAccount>>;

  const accountQuery = useQuery<RegistryAppsResult>({
    queryKey: ["registry-account", accountId],
    queryFn: () => apiClient.getRegistryAppsByAccount({ accountId }),
  });

  const readyApps = useMemo(
    () => (accountQuery.data?.data ?? []).filter((app) => app.status === "ready" && app.hostUrl),
    [accountQuery.data?.data],
  );
  const preferredApp = useMemo(() => {
    if (activeRuntime?.accountId === accountId) {
      return readyApps.find((app) => app.gatewayId === activeRuntime.gatewayId) ?? null;
    }

    if (readyApps.length === 1) {
      return readyApps[0] ?? null;
    }

    return null;
  }, [accountId, activeRuntime?.accountId, activeRuntime?.gatewayId, readyApps]);

  useEffect(() => {
    if (!preferredApp) {
      return;
    }

    window.location.replace(buildHostRuntimeHref(preferredApp.accountId, preferredApp.gatewayId));
  }, [preferredApp]);

  if (accountQuery.isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Resolving runnable gateway...
        </CardContent>
      </Card>
    );
  }

  if (accountQuery.isError) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <p className="text-sm">This account could not be resolved for runtime launch.</p>
          <div className="flex justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => accountQuery.refetch()}
            >
              retry
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={buildPublishedAccountHref(accountId)}>inspect account</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (preferredApp) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Opening {preferredApp.accountId}/{preferredApp.gatewayId}...
        </CardContent>
      </Card>
    );
  }

  if (readyApps.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <p className="text-sm">No runnable gateways were found for this account.</p>
          <Button asChild variant="outline" size="sm">
            <a href={buildPublishedAccountHref(accountId)}>inspect account</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Choose a gateway to run</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This account publishes multiple runnable gateways. Pick the one you want to open in the
            shared host runner.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {readyApps.map((app) => (
            <Card key={app.gatewayId}>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1">
                  <div className="font-medium break-all">
                    {app.metadata?.title ?? app.gatewayId}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground break-all">
                    {app.accountId}/{app.gatewayId}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <a href={buildHostRuntimeHref(app.accountId, app.gatewayId)}>run app</a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href={buildPublishedGatewayHref(app.accountId, app.gatewayId)}>
                      inspect runtime
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
