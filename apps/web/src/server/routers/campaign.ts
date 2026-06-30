import { z } from "zod";

import { protectedProcedure, router } from "../trpc";

export const campaignRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.db.campaign.findMany({
        where: { organizationId: input.organizationId },
        orderBy: { createdAt: "desc" },
      });
    }),
});
