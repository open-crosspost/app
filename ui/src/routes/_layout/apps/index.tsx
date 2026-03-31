import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, CardContent, Input } from "@/components";
import { apiClient } from "@/remote/orpc";

export const Route = createFileRoute("/_layout/apps/" as never)({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" && search.q.length > 0 ? search.q : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Published Apps | everything.dev" },
      {
        name: "description",
        content: "Browse bos-startable apps discovered from published bos.config.json records.",
      },
    ],
  }),
  component: AppsIndex,
});

function AppsIndex() {
  const search = Route.useSearch() as { q?: string };
  const [query, setQuery] = useState(search.q ?? "");

  useEffect(() => {
    setQuery(search.q ?? "");
  }, [search.q]);

  const appsQuery = useQuery({
    queryKey: ["registry-apps", search.q],
    queryFn: () => apiClient.listRegistryApps({ q: search.q || undefined, limit: 48 }),
  });

  const registryStatusQuery = useQuery({
    queryKey: ["registry-status"],
    queryFn: () => apiClient.getRegistryStatus(),
    staleTime: 60_000,
  });

  const apps = appsQuery.data?.data ?? [];
  const stats = useMemo(() => {
    const ready = apps.filter((app) => app.status === "ready").length;
    const claimed = apps.filter((app) => app.metadata?.claimedBy).length;
    const direct = apps.filter((app) => !app.extends).length;

    return {
      total: appsQuery.data?.meta.total ?? 0,
      ready,
      claimed,
      direct,
    };
  }, [apps, appsQuery.data?.meta.total]);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Badge variant="outline">registry</Badge>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Published Apps</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Browse runtimes that resolve from canonical `bos.config.json` records, inspect the
                effective host/ui/api shape, and jump into account or gateway detail views.
              </p>
            </div>

            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                window.location.href = query.trim()
                  ? `/apps?q=${encodeURIComponent(query.trim())}`
                  : "/apps";
              }}
            >
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="search by account or gateway"
                className="font-mono text-sm"
              />
              <div className="flex gap-2">
                <Button type="submit" variant="outline" size="sm">
                  search
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!search.q && query.length === 0}
                  onClick={() => {
                    setQuery("");
                    window.location.href = "/apps";
                  }}
                >
                  clear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <StatBox label="apps" value={String(stats.total)} />
            <StatBox label="ready" value={String(stats.ready)} />
            <StatBox label="claimed" value={String(stats.claimed)} />
            <StatBox label="direct configs" value={String(stats.direct)} />
            {registryStatusQuery.data && (
              <div className="text-xs text-muted-foreground font-mono pt-2 border-t border-border">
                relay {registryStatusQuery.data.relayEnabled ? "enabled" : "disabled"}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {appsQuery.isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Discovering published runtimes...
          </CardContent>
        </Card>
      ) : appsQuery.isError ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-sm">The registry could not be loaded right now.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => appsQuery.refetch()}>
              retry
            </Button>
          </CardContent>
        </Card>
      ) : apps.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <p className="text-sm">No published apps found.</p>
            <p className="text-xs text-muted-foreground">
              Try a different account or gateway search, or clear the filter.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {apps.map((app) => (
            <Card key={`${app.accountId}/${app.gatewayId}`} className="h-full">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={app.status === "ready" ? "default" : "destructive"}>
                        {app.status}
                      </Badge>
                      {app.metadata?.claimedBy ? (
                        <Badge variant="outline">claimed</Badge>
                      ) : (
                        <Badge variant="outline">ready</Badge>
                      )}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <a
                        href={buildGatewayHref(app.accountId, app.gatewayId)}
                        className="block font-medium hover:underline break-all"
                      >
                        {app.metadata?.title ?? `${app.accountId} / ${app.gatewayId}`}
                      </a>
                      <div className="text-xs font-mono text-muted-foreground break-all">
                        {app.accountId} / {app.gatewayId}
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-xs font-mono text-muted-foreground">
                    {app.extends ? "extends" : "direct"}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground min-h-10 leading-relaxed">
                  {app.metadata?.description ?? "No public registry metadata published yet."}
                </p>

                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  <TinyStatus label="host" active={Boolean(app.hostUrl)} />
                  <TinyStatus label="ui" active={Boolean(app.uiUrl)} />
                  <TinyStatus label="api" active={Boolean(app.apiUrl)} />
                </div>

                <div className="rounded-sm border border-border bg-muted/10 p-3 text-xs font-mono text-muted-foreground break-all">
                  {app.hostUrl ?? app.uiUrl ?? app.apiUrl ?? app.canonicalKey}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <a href={buildGatewayHref(app.accountId, app.gatewayId)}>runtime view</a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href={buildAccountHref(app.accountId)}>account view</a>
                  </Button>
                  {app.openUrl && (
                    <Button asChild variant="outline" size="sm">
                      <a href={app.openUrl} target="_blank" rel="noreferrer">
                        open app
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function buildAccountHref(accountId: string) {
  return `/apps/${encodeURIComponent(accountId)}`;
}

function buildGatewayHref(accountId: string, gatewayId: string) {
  return `/apps/${encodeURIComponent(accountId)}/${encodeURIComponent(gatewayId)}`;
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-muted/10 p-3 space-y-1">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function TinyStatus({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="rounded-sm border border-border bg-muted/10 px-2 py-2 flex items-center justify-between gap-2">
      <span>{label}</span>
      <span className={active ? "text-foreground" : "text-muted-foreground"}>
        {active ? "yes" : "-"}
      </span>
    </div>
  );
}
