import { queryOptions } from "@tanstack/react-query";
import { authClient } from "./auth-client";

export interface User {
  id: string;
  email?: string;
  name?: string;
  image?: string | null;
  role?: string;
  banned?: boolean;
  isAnonymous?: boolean;
  emailVerified?: boolean;
}

export interface SessionInfo {
  id: string;
  userId: string;
  expiresAt: Date;
  token: string;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface SessionData {
  user: User;
  session: SessionInfo;
}

export const sessionQueryOptions = (initialSession?: SessionData | null) =>
  queryOptions({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: session } = await authClient.getSession();
      return session as SessionData | null;
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    initialData: initialSession,
  });

export function getSessionFromData(session: SessionData | null | undefined) {
  if (!session?.user) {
    return {
      isAuthenticated: false,
      user: null,
      session: null,
      activeOrganizationId: null,
      isAnonymous: false,
      isAdmin: false,
      isBanned: false,
    };
  }

  return {
    isAuthenticated: true,
    user: session.user,
    session: session.session,
    activeOrganizationId: null,
    isAnonymous: session.user.isAnonymous || false,
    isAdmin: session.user.role === "admin",
    isBanned: session.user.banned || false,
  };
}

export async function signOut() {
  await authClient.signOut();
  await authClient.near.disconnect().catch(() => {});
}

export async function updateProfile(name: string) {
  const { error } = await authClient.updateUser({ name });
  if (error) throw new Error(error.message);
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const { error } = await authClient.changePassword({
    currentPassword,
    newPassword,
  });
  if (error) throw new Error(error.message);
}

export async function revokeOtherSessions() {
  const { error } = await authClient.revokeSessions();
  if (error) throw new Error(error.message);
}

export async function linkNearWallet() {
  await authClient.signIn.near();
}
