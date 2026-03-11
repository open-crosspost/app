import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  sessionQueryOptions,
  organizationsQueryOptions,
  setActiveOrganization,
  inviteMember,
  type Organization,
} from "@/lib/session";
import { apiClient } from "@/remote/orpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_layout/_authenticated/organizations/$id")({
  head: () => ({
    meta: [
      { title: "Organization | demo.everything" },
      { name: "description", content: "Manage organization details and members." },
    ],
  }),
  component: OrganizationDetail,
});

function OrganizationDetail() {
  const queryClient = useQueryClient();
  const { id: orgId } = Route.useParams();
  
  const { data: session } = useQuery(sessionQueryOptions());
  const { data: organizations = [] } = useQuery(organizationsQueryOptions());
  const { data: membersData } = useQuery({
    queryKey: ["org-members", orgId],
    queryFn: () => apiClient.listOrgMembers({ organizationId: orgId }),
  });
  const { data: invitationsData } = useQuery({
    queryKey: ["org-invitations", orgId],
    queryFn: () => apiClient.listOrgInvitations({ organizationId: orgId }),
  });
  const { data: apiKeysData } = useQuery({
    queryKey: ["org-api-keys", orgId],
    queryFn: () => apiClient.listApiKeys({ organizationId: orgId }),
  });
  
  const org = organizations.find((o: Organization) => o.id === orgId);
  const activeOrgId = session?.session?.activeOrganizationId;
  const isActive = orgId === activeOrgId;
  const members = membersData?.members || [];
  const invitations = invitationsData?.invitations || [];
  const apiKeys = apiKeysData?.keys || [];

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");

  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [apiKeyName, setApiKeyName] = useState("");

  const switchOrgMutation = useMutation({
    mutationFn: () => setActiveOrganization(orgId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryOptions().queryKey });
      toast.success("Switched to this organization");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to switch organization");
    },
  });

  const inviteMutation = useMutation({
    mutationFn: () => inviteMember(orgId, inviteEmail, inviteRole),
    onSuccess: () => {
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setShowInviteForm(false);
      queryClient.invalidateQueries({ queryKey: ["org-invitations", orgId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send invitation");
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: (invitationId: string) => apiClient.cancelInvitation({ invitationId }),
    onSuccess: () => {
      toast.success("Invitation cancelled");
      queryClient.invalidateQueries({ queryKey: ["org-invitations", orgId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to cancel invitation");
    },
  });

  const createApiKeyMutation = useMutation({
    mutationFn: () => apiClient.createApiKey({ organizationId: orgId, name: apiKeyName }),
    onSuccess: (data) => {
      toast.success(`API key created: ${data.key}`);
      setApiKeyName("");
      setShowApiKeyForm(false);
      queryClient.invalidateQueries({ queryKey: ["org-api-keys", orgId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create API key");
    },
  });

  const deleteApiKeyMutation = useMutation({
    mutationFn: (keyId: string) => apiClient.deleteApiKey({ keyId }),
    onSuccess: () => {
      toast.success("API key deleted");
      queryClient.invalidateQueries({ queryKey: ["org-api-keys", orgId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete API key");
    },
  });

  if (!org) {
    return (
      <div className="space-y-8">
        <section className="space-y-4">
          <Link
            to="/organizations"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
          >
            ← back to organizations
          </Link>
          <h1 className="text-lg font-mono">Organization Not Found</h1>
        </section>
        <p className="text-xs text-muted-foreground">
          This organization does not exist or you don't have access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Link
              to="/organizations"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
            >
              ← back to organizations
            </Link>
            <h1 className="text-lg font-mono mt-2">{org.name}</h1>
            <p className="text-xs text-muted-foreground font-mono">@{org.slug}</p>
          </div>
          <div className="flex items-center gap-2">
            {!isActive && (
              <Button
                onClick={() => switchOrgMutation.mutate()}
                disabled={switchOrgMutation.isPending}
                variant="outline"
                size="sm"
              >
                {switchOrgMutation.isPending ? "switching..." : "switch to"}
              </Button>
            )}
            {isActive && (
              <span className="px-3 py-2 text-xs font-mono border border-border bg-muted/20">
                active
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-mono text-muted-foreground border-b border-border pb-2">
          details
        </h2>
        
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-xs font-mono">
              <tbody>
                <tr className="border-b border-border">
                  <td className="px-4 py-3 text-muted-foreground text-right w-32">id</td>
                  <td className="px-4 py-3">
                    <code className="text-xs">{org.id}</code>
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-3 text-muted-foreground text-right">name</td>
                  <td className="px-4 py-3">{org.name}</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-3 text-muted-foreground text-right">slug</td>
                  <td className="px-4 py-3">@{org.slug}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-muted-foreground text-right">created</td>
                  <td className="px-4 py-3">
                    {org.createdAt ? new Date(org.createdAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono text-muted-foreground border-b border-border pb-2 flex-1">
            members ({members.length})
          </h2>
          <Button
            onClick={() => setShowInviteForm(!showInviteForm)}
            variant="outline"
            size="sm"
          >
            {showInviteForm ? "cancel" : "invite"}
          </Button>
        </div>

        {showInviteForm && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                className="font-mono text-xs"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
                className="w-full px-3 py-2 text-xs font-mono bg-background border border-border focus:border-foreground transition-colors outline-none"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <Button
                onClick={() => inviteMutation.mutate()}
                disabled={inviteMutation.isPending || !inviteEmail}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {inviteMutation.isPending ? "sending..." : "send invitation"}
              </Button>
            </CardContent>
          </Card>
        )}

        {members.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              {members.map((member, index) => (
                <div
                  key={member.id}
                  className={`p-4 flex items-center justify-between ${
                    index !== members.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div>
                    <p className="text-xs font-mono">{member.name || member.email || member.userId}</p>
                    <p className="text-xs text-muted-foreground font-mono">{member.role}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground text-center">No members found</p>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-mono text-muted-foreground border-b border-border pb-2">
          pending invitations ({invitations.length})
        </h2>

        {invitations.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              {invitations.map((invitation, index) => (
                <div
                  key={invitation.id}
                  className={`p-4 flex items-center justify-between ${
                    index !== invitations.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div>
                    <p className="text-xs font-mono">{invitation.email}</p>
                    <p className="text-xs text-muted-foreground font-mono">{invitation.role}</p>
                  </div>
                  <Button
                    onClick={() => cancelInvitationMutation.mutate(invitation.id)}
                    disabled={cancelInvitationMutation.isPending}
                    variant="outline"
                    size="sm"
                  >
                    cancel
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground text-center">No pending invitations</p>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono text-muted-foreground border-b border-border pb-2 flex-1">
            api keys ({apiKeys.length})
          </h2>
          <Button
            onClick={() => setShowApiKeyForm(!showApiKeyForm)}
            disabled={createApiKeyMutation.isPending}
            variant="outline"
            size="sm"
          >
            {showApiKeyForm ? "cancel" : "new key"}
          </Button>
        </div>

        {showApiKeyForm && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <Input
                type="text"
                value={apiKeyName}
                onChange={(e) => setApiKeyName(e.target.value)}
                placeholder="API key name"
                className="font-mono text-xs"
              />
              <Button
                onClick={() => createApiKeyMutation.mutate()}
                disabled={createApiKeyMutation.isPending || !apiKeyName}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {createApiKeyMutation.isPending ? "creating..." : "create key"}
              </Button>
            </CardContent>
          </Card>
        )}

        {apiKeys.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              {apiKeys.map((key, index) => (
                <div
                  key={key.id}
                  className={`p-4 flex items-center justify-between ${
                    index !== apiKeys.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div>
                    <p className="text-xs font-mono">{key.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{key.prefix}...</p>
                  </div>
                  <Button
                    onClick={() => deleteApiKeyMutation.mutate(key.id)}
                    disabled={deleteApiKeyMutation.isPending}
                    variant="outline"
                    size="sm"
                  >
                    delete
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground text-center">No API keys</p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
