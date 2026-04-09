import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { createContext, type ReactNode, useContext, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { type SessionData, sessionQueryOptions } from "@/lib/session";
import { useDraftsStore } from "@/store/drafts-store";
import { usePlatformAccountsStore } from "@/store/platform-accounts-store";

interface IAuthContext {
  isAuthenticated: boolean;
  user: SessionData["user"] | null;
  session: SessionData["session"] | null;
  isAnonymous: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<IAuthContext | undefined>(undefined);

export function useAuth(): IAuthContext {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
  pretendAccountId?: string | null;
  initialSession?: SessionData | null;
}

export function AuthProvider({
  children,
  pretendAccountId,
  initialSession,
}: AuthProviderProps): React.ReactElement {
  const queryClient = useQueryClient();
  const { data: session, isLoading } = useQuery(sessionQueryOptions(initialSession));

  const { clearSelectedAccounts } = usePlatformAccountsStore();
  const { drafts, deleteDraft, clearAutoSave } = useDraftsStore();

  const isAuthenticated = !!session?.user;
  const user = session?.user ?? null;
  const sessionData = session?.session ?? null;
  const isAnonymous = session?.user?.isAnonymous ?? false;

  useEffect(() => {
    if (!isAuthenticated) {
      clearSelectedAccounts();
      clearAutoSave();
      if (drafts.length > 0) {
        drafts.forEach((draft) => {
          deleteDraft(draft.id);
        });
      }
    }
  }, [isAuthenticated, clearSelectedAccounts, deleteDraft, clearAutoSave, drafts]);

  useEffect(() => {
    if (pretendAccountId) {
      queryClient.setQueryData(sessionQueryOptions().queryKey, {
        user: {
          id: pretendAccountId,
          name: pretendAccountId,
          isAnonymous: false,
        },
        session: {
          id: "pretend-session",
          userId: pretendAccountId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          token: "pretend-token",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }
  }, [pretendAccountId, queryClient]);

  const contextValue: IAuthContext = {
    isAuthenticated,
    user,
    session: sessionData,
    isAnonymous,
    isLoading,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
