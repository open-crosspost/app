import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { type SessionData, sessionQueryKey, sessionQueryOptions, useAuthClient } from "@/app";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/_authenticated/settings/")({
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const authClient = useAuthClient();
  const { data: session } = useQuery<SessionData | null>(sessionQueryOptions(authClient));

  const handleSignOut = async () => {
    await authClient.signOut();
    await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    await router.invalidate();
    await router.navigate({ to: "/" });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Account</p>
            <p className="text-sm text-muted-foreground">
              {session?.user?.name || session?.user?.email || "Anonymous"}
            </p>
          </div>
          <Button variant="destructive" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Back to App</p>
            <p className="text-sm text-muted-foreground">Return to the main application</p>
          </div>
          <Button asChild>
            <Link to="/">Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}