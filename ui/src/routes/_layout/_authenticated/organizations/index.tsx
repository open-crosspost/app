import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  sessionQueryOptions,
  organizationsQueryOptions,
  setActiveOrganization,
  isPersonalOrganization,
  type Organization,
} from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_layout/_authenticated/organizations/")({
  head: () => ({
    meta: [
      { title: "Organizations | demo.everything" },
      { name: "description", content: "Manage your organizations and teams." },
    ],
  }),
  component: OrganizationsList,
});

function OrganizationsList() {
  const queryClient = useQueryClient();
  
  const { data: session } = useQuery(sessionQueryOptions());
  const { data: organizations = [] } = useQuery(organizationsQueryOptions());
  
  const user = session?.user;
  const activeOrgId = session?.session?.activeOrganizationId;

  const switchOrgMutation = useMutation({
    mutationFn: (orgId: string) => setActiveOrganization(orgId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryOptions().queryKey });
      toast.success("Switched organization");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to switch organization");
    },
  });

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-mono">Organizations</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {organizations.length} organization{organizations.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/organizations/new">
              new org
            </Link>
          </Button>
        </div>
      </section>

      {organizations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm font-mono">No organizations yet</p>
            <p className="text-xs text-muted-foreground mt-2">
              Create your first organization to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          {organizations.map((org: Organization, index: number) => {
            const isActive = org.id === activeOrgId;
            const isPersonal = user ? isPersonalOrganization(org, user.id) : false;
            
            return (
              <div
                key={org.id}
                className={`p-4 flex items-center justify-between ${
                  index !== organizations.length - 1 ? "border-b border-border" : ""
                } ${isActive ? "bg-muted/20" : ""}`}
              >
                <div className="flex items-center gap-3">
                  {org.logo ? (
                    <img 
                      src={org.logo} 
                      alt="" 
                      className="w-8 h-8 border border-border object-cover" 
                    />
                  ) : (
                    <div className="w-8 h-8 border border-border flex items-center justify-center text-sm font-mono">
                      {org.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">{org.name}</span>
                      {isActive && (
                        <span className="text-xs text-muted-foreground font-mono border border-border px-2 py-0.5">
                          active
                        </span>
                      )}
                      {isPersonal && (
                        <span className="text-xs text-muted-foreground font-mono">
                          personal
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      @{org.slug}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {!isActive && (
                    <Button
                      onClick={() => switchOrgMutation.mutate(org.id)}
                      disabled={switchOrgMutation.isPending}
                      variant="outline"
                      size="sm"
                    >
                      switch
                    </Button>
                  )}
                  <Button asChild variant="outline" size="sm">
                    <Link
                      to="/organizations/$id"
                      params={{ id: org.id }}
                    >
                      view
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      <section className="space-y-4">
        <h2 className="text-xs font-mono text-muted-foreground border-b border-border pb-2">
          about organizations
        </h2>
        <Card className="bg-muted/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Organizations are workspaces for collaboration. Each user has a personal organization automatically created. You can create additional organizations for teams and invite members to collaborate.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
