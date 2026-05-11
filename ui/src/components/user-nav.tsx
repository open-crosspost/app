import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { LogOut, User } from "lucide-react";
import { sessionQueryKey, sessionQueryOptions, useAuthClient } from "@/app";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserNav() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const authClient = useAuthClient();
  const { data: session } = useQuery(sessionQueryOptions(authClient));
  const isAuthenticated = !!session?.user;

  const handleSignOut = async () => {
    await authClient.signOut();
    await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    await router.invalidate();
    await router.navigate({ to: "/" });
  };

  if (!isAuthenticated) {
    return (
      <Button size="sm" asChild>
        <Link to="/login">Sign in</Link>
      </Button>
    );
  }

  const displayName = session?.user?.name || session?.user?.email || "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <User size={16} />
          <span className="hidden sm:inline max-w-[120px] truncate">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to="/settings" className="flex items-center gap-2">
            <User size={14} />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleSignOut}
          className="flex items-center gap-2 text-destructive"
        >
          <LogOut size={14} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
