import { z } from "zod";

import { protectedProcedure, router } from "../trpc";

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "organizacao"
  );
}

export const authRouter = router({
  // Cria a Organization + Member do usuario recem-cadastrado, se ainda nao existir.
  // Idempotente: seguro de chamar mais de uma vez para o mesmo usuario.
  completeRegistration: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const existing = await ctx.db.member.findFirst({
        where: { userId: ctx.user.id },
        select: { organizationId: true },
      });

      if (existing) {
        return { organizationId: existing.organizationId };
      }

      const slug = `${slugify(input.name)}-${ctx.user.id.slice(0, 8)}`;

      const organization = await ctx.db.organization.create({
        data: {
          name: `Organização de ${input.name}`,
          slug,
          members: {
            create: {
              userId: ctx.user.id,
              role: "OWNER",
            },
          },
        },
      });

      return { organizationId: organization.id };
    }),
});
