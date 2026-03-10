import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "../../../../lib/auth-client";

export const Route = createFileRoute("/_layout/_authenticated/organizations/")({
  loader: async () => {
    const { data: orgs } = await authClient.organization.list();
    const { data: session } = await authClient.getSession();
    return { orgs: orgs || [], activeOrgId: session?.session?.activeOrganizationId };
  },
  head: () => ({
    meta: [
      { title: "Organizations | demo.everything" },
      { name: "description", content: "Manage your organizations and teams." },
      { property: "og:title", content: "Organizations | demo.everything" },
      { property: "og:description", content: "Manage your organizations and teams." },
    ],
  }),
  component: OrganizationsList,
});

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  metadata?: any;
  createdAt?: Date;
}

function OrganizationsList() {
  const router = useRouter();
  const { data: initialOrgs, activeOrgId: initialActiveOrgId } = Route.useLoaderData() as { 
    data: Organization[]; 
    activeOrgId: string | null 
  };
  const [activeOrgId, setActiveOrgId] = useState(initialActiveOrgId);

  const orgsQuery = useSuspenseQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data } = await authClient.organization.list();
      return data || [];
    },
    initialData: initialOrgs,
  });

  const switchOrgMutation = useMutation({
    mutationFn: async (orgId: string) => {
      await authClient.organization.setActive({ organizationId: orgId });
      return orgId;
    },
    onSuccess: (orgId) => {
      setActiveOrgId(orgId);
      toast.success("Switched organization");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to switch organization");
    },
  });

  const organizations = orgsQuery.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-border/50">
        <div>
          <button
            type="button"
            onClick={() => router.history.back()}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
          >
            ← back
          </button>
          <h1 className="text-lg font-mono mt-2">Organizations</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {organizations.length} organization{organizations.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.navigate({ to: "/organizations/new" })}
          className="px-3 py-1.5 text-xs font-mono border border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-all rounded-md"
        >
          + new org
        </button>
      </div>

      <div className="space-y-2">
        {organizations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p className="text-sm font-mono">No organizations yet</p>
            <p className="text-xs mt-1">Create your first organization</p>
          </div>
        ) : (
          organizations.map((org: Organization) => (
            <div
              key={org.id}
              className={`block p-4 rounded-lg border transition-all ${
                org.id === activeOrgId
                  ? "bg-primary/5 border-primary/30"
                  : "bg-muted/10 border-border/50 hover:border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {org.logo ? (
                    <img src={org.logo} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-mono text-primary">
                      {org.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{org.name}</span>
                      {org.id === activeOrgId && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-mono">
                          active
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">@{org.slug}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => switchOrgMutation.mutate(org.id)}
                    disabled={switchOrgMutation.isPending || org.id === activeOrgId}
                    className="px-2 py-1 text-xs font-mono border border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-all rounded disabled:opacity-50"
                  >
                    {org.id === activeOrgId ? "active" : "switch"}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.navigate({ to: "/organizations/$id", params: { id: org.id } })}
                    className="px-2 py-1 text-xs font-mono border border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-all rounded"
                  >
                    view
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
        <h3 className="text-xs font-mono font-medium mb-2">About Organizations</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Organizations are workspaces for collaboration. Each user has a personal organization automatically created.
          You can create additional organizations for teams and invite members to collaborate.
        </p>
      </div>
    </div>
  );
}
