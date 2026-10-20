import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { sessionQueryKey, useAuthClient } from "@/app";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/settings/")({
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const authClient = useAuthClient();
  const { data: session } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
    await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    await router.invalidate();
    await router.navigate({ to: "/_public/" });
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
            <Link to="/_public/">Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
