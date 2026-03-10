import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "../../../../lib/auth-client";

export const Route = createFileRoute("/_layout/_authenticated/organizations/$id")({
  loader: async ({ params }) => {
    // Get organization details from Better Auth
    const { data: orgs } = await authClient.organization.list();
    const org = orgs?.find((o) => o.id === params.id);
    return { orgId: params.id, org };
  },
  head: () => ({
    meta: [
      { title: "Organization | demo.everything" },
      { name: "description", content: "Manage organization details and members." },
      { property: "og:title", content: "Organization | demo.everything" },
      { property: "og:description", content: "Manage organization details and members." },
    ],
  }),
  component: OrganizationDetail,
});

interface Member {
  id: string;
  userId: string;
  email?: string;
  name?: string;
  role: string;
  createdAt?: Date;
}

function OrganizationDetail() {
  const router = useRouter();
  const { id: orgId } = Route.useParams();
  const { org: initialOrg } = Route.useLoaderData() as { 
    orgId: string; 
    org: { id: string; name: string; slug: string; logo?: string | null } | undefined 
  };

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");

  // Get current session to check active org
  const { data: session } = useSuspenseQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await authClient.getSession();
      return data;
    },
  });

  const isActiveOrg = session?.session?.activeOrganizationId === orgId;

  const switchOrgMutation = useMutation({
    mutationFn: async () => {
      await authClient.organization.setActive({ organizationId: orgId });
    },
    onSuccess: () => {
      toast.success("Switched to this organization");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to switch organization");
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await authClient.organization.inviteMember({
        organizationId: orgId,
        email: inviteEmail,
        role: inviteRole,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setShowInviteForm(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send invitation");
    },
  });

  // Note: Better Auth doesn't expose member list directly via client
  // This would need to be fetched from the server or we show limited info
  const members: Member[] = []; // Placeholder - Better Auth client doesn't expose full member list

  if (!initialOrg) {
    return (
      <div className="space-y-6">
        <div className="pb-4 border-b border-border/50">
          <button
            type="button"
            onClick={() => router.navigate({ to: "/organizations" })}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
          >
            ← back to organizations
          </button>
          <h1 className="text-lg font-mono mt-2">Organization Not Found</h1>
        </div>
        <p className="text-sm text-muted-foreground">This organization does not exist or you don&apos;t have access.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-border/50">
        <button
          type="button"
          onClick={() => router.navigate({ to: "/organizations" })}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
        >
          ← back to organizations
        </button>
        <div className="flex items-start justify-between mt-2">
          <div className="flex items-center gap-3">
            {initialOrg.logo ? (
              <img src={initialOrg.logo} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-mono text-primary">
                {initialOrg.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-lg font-mono">{initialOrg.name}</h1>
              <p className="text-xs text-muted-foreground font-mono">@{initialOrg.slug}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isActiveOrg && (
              <button
                type="button"
                onClick={() => switchOrgMutation.mutate()}
                disabled={switchOrgMutation.isPending}
                className="px-3 py-1.5 text-xs font-mono border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-all rounded-md disabled:opacity-50"
              >
                {switchOrgMutation.isPending ? "switching..." : "switch to org"}
              </button>
            )}
            {isActiveOrg && (
              <span className="px-3 py-1.5 text-xs font-mono border border-primary/30 bg-primary/5 text-primary rounded-md">
                active
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-mono">Members ({members.length})</h2>
          <button
            type="button"
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="px-3 py-1.5 text-xs font-mono border border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-all rounded-md"
          >
            {showInviteForm ? "cancel" : "+ invite member"}
          </button>
        </div>

        {showInviteForm && (
          <div className="p-4 bg-muted/20 rounded-lg border border-border/50 space-y-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono bg-background border border-border focus:border-ring rounded-md outline-none transition-colors"
              placeholder="email@example.com"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
              className="w-full px-3 py-2 text-sm font-mono bg-background border border-border focus:border-ring rounded-md outline-none transition-colors"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="button"
              onClick={() => inviteMutation.mutate()}
              disabled={inviteMutation.isPending || !inviteEmail}
              className="w-full px-3 py-2 text-sm font-mono bg-primary text-primary-foreground hover:bg-primary/90 rounded-md disabled:opacity-50 transition-colors"
            >
              {inviteMutation.isPending ? "sending..." : "send invitation"}
            </button>
          </div>
        )}

        <div className="space-y-2">
          {members.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-sm font-mono">No members to display</p>
              <p className="text-xs mt-1">Invite team members to collaborate</p>
            </div>
          ) : (
            members.map((member: Member) => (
              <div
                key={member.id}
                className="p-3 bg-muted/10 rounded-lg border border-border/50 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center text-sm font-mono">
                    {(member.name || member.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-mono">{member.name || member.email || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground font-mono">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono capitalize">{member.role}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
