import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import {
  ChevronDown,
  LogOut,
  Megaphone,
  Moon,
  PenSquare,
  Sun,
  Trophy,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";
import type * as React from "react";
import { sessionQueryKey, sessionQueryOptions, useAuthClient } from "@/app";
import { CampaignsTour } from "./campaigns-tour";
import { ConnectToNearButton } from "./connect-to-near";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export const Header: React.FC = () => {
  const authClient = useAuthClient();
  const { data: session } = useQuery(sessionQueryOptions(authClient));
  const queryClient = useQueryClient();
  const router = useRouter();
  const userId = session?.user?.id ?? null;
  const profileAccountId = session?.user?.name ?? userId;
  const isSignedIn = !!session?.user;
  const { theme, setTheme, systemTheme } = useTheme();
  const isDarkMode = theme === "dark" || (theme === "system" && systemTheme === "dark");
  const toggleDarkMode = () => setTheme(isDarkMode ? "light" : "dark");

  const handleSignOut = async () => {
    await authClient.signOut();
    await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    await router.invalidate();
  };

  return (
    <div className="relative border-b-2 border-primary bg-background p-3 sm:p-6">
      <div className="flex min-w-0 flex-row items-center justify-between gap-2 sm:gap-3">
        <Link to={isSignedIn ? "/editor" : "/"} className="min-w-0 shrink">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <PenSquare className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
            <h1 className="truncate text-xl font-bold sm:text-3xl">crosspost</h1>
          </div>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <Button
            onClick={toggleDarkMode}
            size="icon"
            className="h-9 w-9 shrink-0 p-0"
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
          {!isSignedIn ? (
            <ConnectToNearButton className="flex h-9 min-w-fit items-center gap-2 px-3 py-2 shadow-[2px_2px_0_0_rgb(0,0,0)] sm:px-4 dark:shadow-[2px_2px_0_0_rgba(255,255,255,0.3)]" />
          ) : null}
          {isSignedIn && userId ? (
            <>
              <CampaignsTour userId={userId}>
                <Link to="/campaigns">
                  <Button
                    className="flex h-9 min-w-9 items-center justify-center gap-2 px-2 sm:min-w-fit sm:px-4"
                    title="Campaigns"
                  >
                    <Megaphone size={16} />
                    <span className="hidden sm:inline">Campaigns</span>
                  </Button>
                </Link>
              </CampaignsTour>
              <Link to="/leaderboard">
                <Button
                  className="flex h-9 min-w-9 items-center justify-center gap-2 px-2 sm:min-w-fit sm:px-4"
                  title="Leaderboard"
                >
                  <Trophy size={16} />
                  <span className="hidden sm:inline">Leaderboard</span>
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="flex h-9 min-w-9 items-center justify-center gap-2 px-2 sm:min-w-fit sm:px-4"
                    title="Profile"
                  >
                    <User size={16} className="sm:hidden" />
                    <span className="hidden text-sm sm:inline">Profile</span>
                    <ChevronDown size={14} className="hidden shrink-0 sm:inline" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="border border-muted-foreground/40 shadow-[2px_2px_0_0_rgb(0,0,0)] dark:border-muted-foreground/50 dark:shadow-[2px_2px_0_0_rgba(255,255,255,0.3)]"
                >
                  {profileAccountId ? (
                    <DropdownMenuItem asChild>
                      <Link
                        to="/profile/$accountId"
                        params={{ accountId: profileAccountId }}
                        className="flex items-center gap-2"
                      >
                        <User size={16} />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="flex items-center gap-2 text-destructive"
                  >
                    <LogOut size={16} />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
