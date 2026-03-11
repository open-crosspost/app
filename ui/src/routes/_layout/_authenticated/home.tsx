import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import {
  sessionQueryOptions,
  organizationsQueryOptions,
  passkeysQueryOptions,
  getActiveOrganization,
  isPersonalOrganization,
  setActiveOrganization,
} from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_layout/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home | demo.everything" },
      { name: "description", content: "Your workspace center." },
    ],
  }),
  component: Home,
});

function Home() {
  const queryClient = useQueryClient();

  const { data: session } = useQuery(sessionQueryOptions());
  const { data: organizations } = useQuery(organizationsQueryOptions());
  const { data: passkeys } = useQuery(passkeysQueryOptions());

  const user = session?.user;
  const activeOrgId = session?.session?.activeOrganizationId;
  const nearAccountId = authClient.near.getAccountId();

  const activeOrg = useMemo(
    () => getActiveOrganization(organizations || [], activeOrgId),
    [organizations, activeOrgId]
  );

  const { isAnonymous, hasEmail, hasNear, hasPasskeys, isAdmin } = useMemo(() => {
    if (!user) return { isAnonymous: false, hasEmail: false, hasNear: false, hasPasskeys: false, isAdmin: false };
    return {
      isAnonymous: user.isAnonymous || false,
      hasEmail: !!user.email,
      hasNear: !!nearAccountId,
      hasPasskeys: !!(passkeys && passkeys.length > 0),
      isAdmin: user.role === "admin",
    };
  }, [user, nearAccountId, passkeys]);

  const switchOrgMutation = useMutation({
    mutationFn: (orgId: string) => setActiveOrganization(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionQueryOptions().queryKey });
      toast.success("Switched organization");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to switch organization");
    },
  });

  if (!user) {
    return (
      <div className="space-y-6">
        <p className="text-xs text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Identity Section */}
      <section className="space-y-4">
        <h2 className="text-sm text-muted-foreground border-b border-border pb-2">
          identity
        </h2>
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-border">
                  <td className="px-4 py-3 text-muted-foreground text-right w-32">user</td>
                  <td className="px-4 py-3">{user.name || user.email || user.id}</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-3 text-muted-foreground text-right">email</td>
                  <td className="px-4 py-3">
                    {hasEmail ? (
                      <span>{user.email}</span>
                    ) : (
                      <Link to="/settings" className="text-link hover:underline">
                        add email →
                      </Link>
                    )}
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-3 text-muted-foreground text-right">near</td>
                  <td className="px-4 py-3">
                    {hasNear ? (
                      <code className="text-sm">{nearAccountId}</code>
                    ) : (
                      <Link to="/settings" className="text-link hover:underline">
                        link wallet →
                      </Link>
                    )}
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-3 text-muted-foreground text-right">passkeys</td>
                  <td className="px-4 py-3">
                    {hasPasskeys ? (
                      <span>{passkeys?.length || 0} registered</span>
                    ) : (
                      <Link to="/settings" className="text-link hover:underline">
                        add passkey →
                      </Link>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-muted-foreground text-right">type</td>
                  <td className="px-4 py-3">
                    {isAnonymous && <span className="text-muted-foreground">anonymous</span>}
                    {isAdmin && <span>admin</span>}
                    {!isAnonymous && !isAdmin && <span>standard</span>}
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
        
        {isAnonymous && (
          <Card className="bg-muted/20">
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your data will be lost when you sign out. Link an email or NEAR wallet to save your progress.
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Active Organization */}
      <section className="space-y-4">
        <h2 className="text-sm text-muted-foreground border-b border-border pb-2">
          active organization
        </h2>
        
        {activeOrg ? (
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {activeOrg.logo ? (
                  <img src={activeOrg.logo} alt="" className="w-8 h-8 border-2 border-outset border-[rgb(51,51,51)] object-cover dark:border-[rgb(100,100,100)]" />
                ) : (
                  <div className="w-8 h-8 border-2 border-outset border-[rgb(51,51,51)] flex items-center justify-center text-sm dark:border-[rgb(100,100,100)]">
                    {activeOrg.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm">{activeOrg.name}</p>
                  <p className="text-xs text-muted-foreground">@{activeOrg.slug}</p>
                </div>
                {isPersonalOrganization(activeOrg, user.id) && (
                  <span className="text-xs text-muted-foreground border-2 border-outset border-[rgb(51,51,51)] px-2 py-1 dark:border-[rgb(100,100,100)]">
                    personal
                  </span>
                )}
              </div>
              <Button asChild variant="outline" size="sm">
                <Link
                  to="/organizations/$id"
                  params={{ id: activeOrg.id }}
                >
                  view
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">No active organization</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Capabilities Grid */}
      <section className="space-y-4">
        <h2 className="text-sm text-muted-foreground border-b border-border pb-2">
          capabilities
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Organizations */}
          <Card className="hover:bg-muted/20 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <Link to="/organizations">
                <h3 className="text-sm mb-2">Organizations</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Manage workspaces, members, and invitations
                </p>
                {organizations && organizations.length > 1 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {organizations.length} organizations
                  </p>
                )}
              </Link>
            </CardContent>
          </Card>

          {/* Identity & Settings */}
          <Card className="hover:bg-muted/20 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <Link to="/settings">
                <h3 className="text-sm mb-2">Identity & Settings</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Profile, linked methods, sessions, security
                </p>
                {!hasEmail && (
                  <p className="text-xs text-muted-foreground mt-2">email not linked</p>
                )}
              </Link>
            </CardContent>
          </Card>

          {/* Developer Access */}
          <Card className="hover:bg-muted/20 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <Link to="/keys">
                <h3 className="text-sm mb-2">Developer Access</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  API keys, developer tools, org-level access
                </p>
              </Link>
            </CardContent>
          </Card>

          {/* Data Tools */}
          <Card className="hover:bg-muted/20 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <Link to="/keys">
                <h3 className="text-sm mb-2">Data Tools</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  KV store, protected endpoints, testing
                </p>
              </Link>
            </CardContent>
          </Card>

          {/* Admin - only if admin */}
          {isAdmin && (
            <Card className="hover:bg-muted/20 transition-colors cursor-pointer sm:col-span-2">
              <CardContent className="p-4">
                <Link to="/dashboard">
                  <h3 className="text-sm mb-2">Admin</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Admin-only dashboard and controls
                  </p>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="space-y-4">
        <h2 className="text-sm text-muted-foreground border-b border-border pb-2">
          quick actions
        </h2>
        
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/organizations/new">
              create org
            </Link>
          </Button>
          
          {organizations && organizations.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const otherOrg = organizations.find(o => o.id !== activeOrgId);
                if (otherOrg) switchOrgMutation.mutate(otherOrg.id);
              }}
              disabled={switchOrgMutation.isPending}
            >
              switch org
            </Button>
          )}
          
          <Button asChild variant="outline" size="sm">
            <Link
              to="/organizations/$id"
              params={{ id: activeOrgId || "" }}
            >
              invite member
            </Link>
          </Button>
          
          <Button asChild variant="outline" size="sm">
            <Link to="/settings">
              add passkey
            </Link>
          </Button>
          
          {!hasNear && (
            <Button asChild variant="outline" size="sm">
              <Link to="/settings">
                link NEAR
              </Link>
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
