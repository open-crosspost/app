import { oc } from "@orpc/contract";
import { z } from "zod";
import { activityContract } from "./activity/contract";
import { socialContract } from "./social/contract";

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

  social: socialContract,

  activity: activityContract,
});

export type ContractType = typeof contract;
