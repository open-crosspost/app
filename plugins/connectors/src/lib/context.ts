/**
 * Request context schema — the auth context the host injects per request.
 *
 * BE CAREFUL MODIFYING THIS FILE — changes will be overwritten by `bos sync` / `bos upgrade`.
 * Prefer upstream changes at https://github.com/nearbuilders/everything-dev
 */

import { z } from "zod";
import type { AuthPluginContext as AuthContext } from "./auth-types.gen";

/**
 * `nearAccountId` is injected by the host (primary session NEAR account) but
 * absent from the upstream auth contract's getContext output — the api plugin
 * declares the same extension locally. Upstream issue filed to add it to
 * getContext so this widening can retire. `user` is widened the same way for
 * the admin-role check (`user.role`).
 */
export const ContextSchema = z.custom<
  AuthContext & {
    nearAccountId?: string;
    user?: { id?: string; role?: string };
  }
>();

export type Context = AuthContext & {
  nearAccountId?: string;
  user?: { id?: string; role?: string };
};
