import { Link } from "@tanstack/react-router";
import { ChevronDown, LogOut, Moon, PenSquare, Sun, Trophy, User } from "lucide-react";
import { useTheme } from "next-themes";
import type * as React from "react";
import { authClient } from "@/lib/auth-client";
import { getNearWalletDisplayFromSession } from "@/lib/near-session-display";
import { signOut } from "@/lib/session";
import { ConnectToNearButton } from "./connect-to-near";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export const Header: React.FC = () => {
  const { data: session } = authClient.useSession();
  const profileAccountId = getNearWalletDisplayFromSession(session);
  const isSignedIn = !!session?.user;
  const { theme, setTheme, systemTheme } = useTheme();
  const isDarkMode = theme === "dark" || (theme === "system" && systemTheme === "dark");
  const toggleDarkMode = () => setTheme(isDarkMode ? "light" : "dark");

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  return (
    <div className="relative border-b-2 border-primary bg-white dark:bg-black p-4 sm:p-6">
      <div className="flex flex-col items-center space-y-4 sm:flex-row sm:justify-between sm:space-y-0 sm:items-center">
        <Link to="/editor" className="flex-shrink-0">
          <div className="flex items-center gap-2">
            <PenSquare size={24} />
            <h1 className="text-3xl font-bold">crosspost</h1>
          </div>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            onClick={toggleDarkMode}
            size="icon"
            className="flex items-center justify-center w-9 h-9 p-0 flex-shrink-0"
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
          {!isSignedIn && <ConnectToNearButton />}
          {isSignedIn && profileAccountId && (
            <>
              <Link to="/leaderboard">
                <Button className="flex items-center gap-2 px-3 sm:px-4 py-2 h-9 min-w-fit">
                  <Trophy size={16} />
                  <span>Leaderboard</span>
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="flex items-center gap-2 px-3 sm:px-4 py-2 h-9 min-w-fit">
                    <span className="text-sm">Profile</span>
                    <ChevronDown size={14} className="flex-shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="flex items-center gap-2 text-red-600"
                  >
                    <LogOut size={16} />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
