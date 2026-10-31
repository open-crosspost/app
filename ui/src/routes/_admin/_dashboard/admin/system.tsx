import { createFileRoute } from "@tanstack/react-router";
import { getAccount, getActiveRuntime, getAppName, getRepository } from "@/app";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_admin/_dashboard/admin/system")({
  component: AdminSystem,
});

function InfoRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="truncate font-mono text-sm text-foreground">
        {value == null ? "—" : String(value)}
      </dd>
    </div>
  );
}

function AdminSystem() {
  const { runtimeConfig } = Route.useRouteContext();
  const account = getAccount(runtimeConfig);
  const appName = getAppName(runtimeConfig);
  const repository = getRepository(runtimeConfig);
  const runtime = getActiveRuntime(runtimeConfig);

  const env = runtimeConfig?.env;
  const networkId = runtimeConfig?.networkId;
  const hostUrl = runtimeConfig?.hostUrl;
  const apiBase = runtimeConfig?.apiBase;
  const rpcBase = runtimeConfig?.rpcBase;
  const assetsUrl = runtimeConfig?.assetsUrl;
  const runtimeBasePath = runtime?.runtimeBasePath;

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">System</h1>
          {env ? (
            <Badge
              variant={env === "production" ? "default" : "secondary"}
              data-testid="admin-system-env"
            >
              {env}
            </Badge>
          ) : null}
          {networkId ? (
            <Badge variant="outline" data-testid="admin-system-network">
              {networkId}
            </Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">Runtime configuration for this deployment.</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Runtime
        </h2>
        <dl>
          <InfoRow label="Account" value={runtime?.accountId ?? account} />
          <InfoRow label="Name" value={appName} />
          <InfoRow label="Gateway" value={runtime?.gatewayId} />
          <InfoRow label="Base path" value={runtimeBasePath ?? "/"} />
        </dl>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Deployment
        </h2>
        <dl>
          <InfoRow label="Environment" value={env} />
          <InfoRow label="Network" value={networkId} />
          <InfoRow label="Host" value={hostUrl} />
          <InfoRow label="Repository" value={repository} />
        </dl>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Endpoints
        </h2>
        <dl>
          <InfoRow label="API" value={apiBase} />
          <InfoRow label="RPC" value={rpcBase} />
          <InfoRow label="Assets" value={assetsUrl} />
        </dl>
      </section>
    </div>
  );
}
