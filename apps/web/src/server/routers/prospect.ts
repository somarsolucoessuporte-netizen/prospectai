import { z } from "zod";

import { protectedProcedure, router } from "../trpc";

export const prospectRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.db.prospect.findMany({
        where: { organizationId: input.organizationId },
        orderBy: { createdAt: "desc" },
      });
    }),
});
