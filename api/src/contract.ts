import { oc } from "@orpc/contract";
import { z } from "zod";

export const contract = oc.router({
  ping: oc.route({ method: "GET", path: "/ping" }).output(
    z.object({
      status: z.string(),
      timestamp: z.iso.datetime(),
    }),
  ),

  reloadConfig: oc.route({ method: "POST", path: "/v1/reload-config" }).output(
    z.object({
      status: z.enum(["pending"]),
      note: z.string(),
    }),
  ),
});

export type ContractType = typeof contract;
