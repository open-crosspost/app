export function getNearWalletDisplayFromSession(session: { user?: unknown } | null | undefined): string | null {
  const user = session?.user as
    | { nearAccount?: { accountId?: string }; name?: string; id?: string }
    | undefined;
  return user?.nearAccount?.accountId ?? user?.name ?? user?.id ?? null;
}
