import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { sessionQueryOptions, organizationsQueryOptions } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/accept-invitation/$invitationId")({
  beforeLoad: async ({ params, location }) => {
    const { data: session } = await authClient.getSession();
    if (!session?.user) {
      throw redirect({
        to: "/login",
        search: { redirect: location.pathname },
      });
    }
    return { session, invitationId: params.invitationId };
  },
  component: AcceptInvitation,
});

function AcceptInvitation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { invitationId } = Route.useParams();
  const [error, setError] = useState<string | null>(null);

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await authClient.organization.acceptInvitation({
        invitationId,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryOptions().queryKey });
      await queryClient.invalidateQueries({ queryKey: organizationsQueryOptions().queryKey });
      toast.success("Invitation accepted! Welcome to the organization.");
      if (data?.invitation?.organizationId) {
        router.navigate({ to: "/organizations/$id", params: { id: data.invitation.organizationId } });
      } else {
        router.navigate({ to: "/organizations" });
      }
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to accept invitation");
    },
  });

  const handleAccept = () => {
    setError(null);
    acceptMutation.mutate();
  };

  const handleDecline = () => {
    router.navigate({ to: "/" });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-lg font-mono">Organization Invitation</h1>
          <p className="text-xs text-muted-foreground mt-2">
            You&apos;ve been invited to join an organization
          </p>
        </div>

        {error && (
          <div className="p-4 border border-border bg-muted/20 text-center">
            <p className="text-xs text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground mt-2">
              The invitation may have expired or already been used.
            </p>
          </div>
        )}

        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-12 h-12 mx-auto border border-border flex items-center justify-center">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>

            <p className="text-xs text-muted-foreground">
              Click below to accept the invitation and join the organization
            </p>

            <Button
              onClick={handleAccept}
              disabled={acceptMutation.isPending}
              variant="outline"
              className="w-full"
            >
              {acceptMutation.isPending ? "accepting..." : "accept invitation"}
            </Button>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button
            onClick={handleDecline}
            disabled={acceptMutation.isPending}
            variant="ghost"
            size="sm"
          >
            decline and go home
          </Button>
        </div>
      </div>
    </div>
  );
}
