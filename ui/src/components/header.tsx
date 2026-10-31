import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Megaphone, Moon, PenSquare, Sun, Trophy } from "lucide-react";
import { useTheme } from "next-themes";
import type * as React from "react";
import { sessionQueryOptions, useAuthClient } from "@/app";
import { CampaignsTour } from "./campaigns-tour";
import { Button } from "./ui/button";
import { UserNav } from "./user-nav";

export const Header: React.FC = () => {
  const authClient = useAuthClient();
  const { data: session } = useQuery(sessionQueryOptions(authClient));
  const isSignedIn = !!session?.user;
  const { theme, setTheme, systemTheme } = useTheme();
  const isDarkMode = theme === "dark" || (theme === "system" && systemTheme === "dark");
  const toggleDarkMode = () => setTheme(isDarkMode ? "light" : "dark");

  return (
    <div className="sticky top-0 z-20 shrink-0 border-b-2 border-primary bg-background p-3 sm:p-6">
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
          {isSignedIn ? (
            <>
              <CampaignsTour userId={session?.user?.id ?? ""}>
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
            </>
          ) : null}
          <UserNav />
        </div>
      </div>
    </div>
  );
};
