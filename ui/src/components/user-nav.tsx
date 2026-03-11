import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { useMemo } from "react";
import { sessionQueryOptions, organizationsQueryOptions, signOut } from "@/lib/session";
import { Button } from "@/components/ui/button";

export function UserNav() {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const { data: session } = useQuery(sessionQueryOptions());
  const { data: organizations } = useQuery(organizationsQueryOptions());
  
  const user = session?.user;
  const activeOrgId = session?.session?.activeOrganizationId;
  
  const activeOrg = useMemo(() => {
    return organizations?.find(org => org.id === activeOrgId);
  }, [organizations, activeOrgId]);

  const signOutMutation = useMutation({
    mutationFn: async () => {
      await signOut();
      await queryClient.invalidateQueries({ queryKey: sessionQueryOptions().queryKey });
      await queryClient.invalidateQueries({ queryKey: organizationsQueryOptions().queryKey });
    },
    onSuccess: () => {
      router.invalidate();
      window.location.href = "/home";
    },
    onError: (error: Error) => {
      console.error("Sign out error:", error);
    },
  });

  if (!user) {
    return (
      <Button asChild variant="outline">
        <Link to="/login">
          login
        </Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {activeOrg && (
        <Button asChild variant="outline" size="sm" className="hidden sm:flex max-w-[120px]">
          <Link to="/organizations">
            <span className="truncate">{activeOrg.name}</span>
          </Link>
        </Button>
      )}
      
      <div className="relative group">
        <Button variant="outline" className="flex items-center gap-2">
          <span className="truncate max-w-[100px] sm:max-w-[150px]">
            {user.name || user.email || user.id.slice(0, 8)}
          </span>
          <span className="text-muted-foreground hidden sm:inline">▼</span>
        </Button>
        
        <div className="absolute right-0 top-full mt-1 w-48 border-2 border-outset border-[rgb(51,51,51)] bg-background opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 dark:border-[rgb(100,100,100)]">
          <div className="p-3 border-b border-border">
            <p className="text-xs text-muted-foreground">signed in as</p>
            <p className="text-sm truncate">{user.email || user.id}</p>
          </div>
          
          <div className="p-1">
            <Link
              to="/"
              className="block px-3 py-2 text-sm hover:bg-muted/20 transition-colors"
            >
              home
            </Link>
            <Link
              to="/organizations"
              className="block px-3 py-2 text-sm hover:bg-muted/20 transition-colors"
            >
              organizations
            </Link>
            <Link
              to="/settings"
              className="block px-3 py-2 text-sm hover:bg-muted/20 transition-colors"
            >
              settings
            </Link>
            {user.role === "admin" && (
              <Link
                to="/dashboard"
                className="block px-3 py-2 text-sm hover:bg-muted/20 transition-colors"
              >
                admin
              </Link>
            )}
          </div>
          
          <div className="p-1 border-t border-border">
            <button
              type="button"
              onClick={() => signOutMutation.mutate()}
              disabled={signOutMutation.isPending}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-muted/20 transition-colors disabled:opacity-50"
            >
              {signOutMutation.isPending ? "signing out..." : "sign out"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
