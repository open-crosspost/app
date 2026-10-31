/**
 * Request context schema — the auth context the host injects per request.
 *
 * BE CAREFUL MODIFYING THIS FILE — changes will be overwritten by `bos sync` / `bos upgrade`.
 * Prefer upstream changes at https://github.com/nearbuilders/everything-dev
 *
 * The primary NEAR account lives in the host's `near` envelope
 * (`near.primaryAccountId`) — see the upstream request-context reference:
 * packages/everything-dev/skills/plugin-development/references/request-context.md
 * The flat `nearAccountId` field never existed on the wire; the resolver
 * below keeps a fallback for it in case an older host ever sent one.
 */

import { z } from "zod";
import type { AuthPluginContext as AuthContext } from "./auth-types.gen";

export const ContextSchema = z.custom<AuthContext>();

export type Context = AuthContext;

/** The caller's primary NEAR account id, or null when the session has none. */
export const resolveNearAccountId = (context: Context): string | null =>
  context.near?.primaryAccountId ??
  (context as { nearAccountId?: string | null }).nearAccountId ??
  (context as { walletAddress?: string | null }).walletAddress ??
  null;
