import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "../../lib/auth-client";

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
  const { invitationId } = Route.useParams();
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verify the invitation is valid (optional - can be done on accept)
  const { data: invitationData, isLoading: isChecking } = useQuery({
    queryKey: ["invitation", invitationId],
    queryFn: async () => {
      // Better Auth doesn't have a direct "get invitation" endpoint
      // We'll try to accept and handle errors
      return { valid: true };
    },
    enabled: !!invitationId,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await authClient.organization.acceptInvitation({
        invitationId,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      toast.success("Invitation accepted! Welcome to the organization.");
      // Navigate to the organization
      if (data?.organizationId) {
        router.navigate({ to: "/organizations/$id", params: { id: data.organizationId } });
      } else {
        router.navigate({ to: "/organizations" });
      }
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to accept invitation");
      setIsAccepting(false);
    },
  });

  const handleAccept = () => {
    setIsAccepting(true);
    setError(null);
    acceptMutation.mutate();
  };

  const handleDecline = () => {
    router.navigate({ to: "/" });
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="animate-pulse">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 mb-4" />
            <div className="h-4 bg-muted/50 rounded w-3/4 mx-auto mb-2" />
            <div className="h-4 bg-muted/50 rounded w-1/2 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-mono mb-2">Organization Invitation</h1>
          <p className="text-sm text-muted-foreground">
            You&apos;ve been invited to join an organization
          </p>
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-center">
            <p className="text-sm text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground mt-1">
              The invitation may have expired or already been used.
            </p>
          </div>
        )}

        <div className="p-6 bg-muted/20 rounded-lg border border-border/50 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">
              Click below to accept the invitation and join the organization
            </p>
          </div>

          <button
            type="button"
            onClick={handleAccept}
            disabled={isAccepting}
            className="w-full px-4 py-2 text-sm font-mono bg-primary text-primary-foreground hover:bg-primary/90 rounded-md disabled:opacity-50 transition-colors"
          >
            {isAccepting ? "accepting..." : "accept invitation"}
          </button>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={handleDecline}
            disabled={isAccepting}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
          >
            decline and go home
          </button>
        </div>
      </div>
    </div>
  );
}
