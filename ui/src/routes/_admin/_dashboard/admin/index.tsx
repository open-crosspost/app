import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { pluginPath } from "@/app";
import { Badge } from "@/components/ui/badge";

interface VersionEndpointResponse {
  fingerprint?: string;
  slots?: Record<string, string>;
  watch?: { lastOutcome?: string };
}

const OUTCOME_TONES: Record<string, "secondary" | "default" | "destructive"> = {
  clean: "default",
  swapped: "secondary",
  "swap-failed": "destructive",
  "pointer-unreachable": "destructive",
};

export const Route = createFileRoute("/_admin/_dashboard/admin/")({
  component: AdminIndex,
});

function AdminIndex() {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="admin.heading">
          Admin
        </h1>
        <p className="text-sm text-muted-foreground">Platform administration for this runtime.</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Version
        </h2>
        <VersionCard />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          System
        </h2>
        <nav className="flex flex-col gap-2 text-sm" aria-label="Admin pages">
          <Link
            to="/admin/system"
            data-testid="admin-system-link"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Runtime, version, and deployment details
          </Link>
          <Link
            to={pluginPath("/admin/users")}
            className="text-foreground underline-offset-4 hover:underline"
          >
            Users and roles
          </Link>
        </nav>
      </section>
    </div>
  );
}

function VersionCard() {
  const query = useQuery({
    queryKey: ["deployed-version"],
    queryFn: async (): Promise<VersionEndpointResponse> => {
      const response = await fetch("/.well-known/version");
      if (!response.ok) throw new Error(`version endpoint returned ${response.status}`);
      return response.json();
    },
    refetchInterval: 30_000,
  });

  const version = query.data;
  const outcome = version?.watch?.lastOutcome;
  const tone = outcome ? OUTCOME_TONES[outcome] : undefined;

  return (
    <div data-testid="admin-version-card" className="rounded-lg border bg-background p-4">
      <p className="text-sm font-medium">Deployed version</p>
      {query.isLoading ? (
        <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
      ) : query.isError || !version?.fingerprint ? (
        <p className="mt-2 text-sm text-muted-foreground">Version endpoint unreachable.</p>
      ) : (
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <dt className="text-muted-foreground">Fingerprint</dt>
            <dd className="font-mono">{version.fingerprint}</dd>
            {tone ? <Badge variant={tone}>{outcome}</Badge> : null}
          </div>
        </dl>
      )}
    </div>
  );
}
