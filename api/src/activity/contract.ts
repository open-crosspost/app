import { oc } from "@orpc/contract";
import { PluginErrors } from "every-plugin";
import { z } from "zod";

export const activityContract = oc.router({
  campaignCompleted: oc
    .route({ method: "POST", path: "/activity/campaign/{campaignId}/completed" })
    .input(
      z.object({
        campaignId: z.string().min(1),
      }),
    )
    .output(
      z.object({
        recorded: z.boolean(),
      }),
    )
    .errors(PluginErrors),
});
