import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { LogOut, Settings, Shield, User } from "lucide-react";
import { clearAuthenticatedQueries, pluginPath, sessionQueryOptions, useAuthClient } from "@/app";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function SignInButton() {
  return (
    <Button asChild>
      <Link to={pluginPath("/login")}>Sign in</Link>
    </Button>
  );
}

export function UserNav() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const authClient = useAuthClient();
  const { data: session } = useQuery(sessionQueryOptions(authClient));
  const user = session?.user;
  const displayName = user?.name || user?.email || "Account";
  const profileAccountId = user?.name ?? user?.id ?? null;
  const isAnonymous = user?.isAnonymous === true;
  const isAdmin = user?.role === "admin";

  if (!user) {
    return <SignInButton />;
  }

  const handleSignOut = async () => {
    await authClient.signOut();
    await clearAuthenticatedQueries(queryClient);
    await router.invalidate();
    await router.navigate({ to: "/" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={user.image ?? undefined} alt={displayName} />
            <AvatarFallback>{displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[120px] truncate text-sm sm:inline">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {profileAccountId && !isAnonymous ? (
          <DropdownMenuItem asChild>
            <Link
              to="/profile/$accountId"
              params={{ accountId: profileAccountId }}
              className="flex items-center gap-2"
            >
              <User size={14} />
              Profile
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <Link to={pluginPath("/settings")} className="flex items-center gap-2">
            <Settings size={14} />
            Settings
          </Link>
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem asChild>
            <Link to="/admin" className="flex items-center gap-2">
              <Shield size={14} />
              Admin
            </Link>
          </DropdownMenuItem>
        ) : null}
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
