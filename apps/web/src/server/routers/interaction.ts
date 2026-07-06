import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../trpc";

const INTERACTION_TYPES = [
  "NOTE",
  "EMAIL",
  "WHATSAPP",
  "CALL",
  "MEETING",
  "PROPOSAL",
  "FOLLOW_UP",
] as const;

/**
 * Router de Interacoes (CRM) — historico de contatos com um prospect.
 *
 * Toda operacao valida que o prospect pertence a organizacao do usuario,
 * garantindo isolamento multi-tenant.
 */
export const interactionRouter = router({
  // Lista as interacoes de um prospect, mais recente primeiro
  listByProspect: protectedProcedure
    .input(z.object({ prospectId: z.string() }))
    .query(async ({ input, ctx }) => {
      const organizationId = ctx.organizationId;
      if (!organizationId) return [];

      const prospect = await ctx.db.prospect.findFirst({
        where: { id: input.prospectId, organizationId },
        select: { id: true },
      });

      if (!prospect) return [];

      return ctx.db.interaction.findMany({
        where: { prospectId: input.prospectId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          notes: true,
          userId: true,
          createdAt: true,
        },
      });
    }),

  // Registra uma nova interacao (nota, contato por WhatsApp, ligacao, etc.)
  create: protectedProcedure
    .input(
      z.object({
        prospectId: z.string(),
        type: z.enum(INTERACTION_TYPES),
        notes: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.organizationId;
      if (!organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Organizacao nao encontrada" });
      }

      const prospect = await ctx.db.prospect.findFirst({
        where: { id: input.prospectId, organizationId },
        select: { id: true, status: true },
      });

      if (!prospect) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prospect nao encontrado" });
      }

      const interaction = await ctx.db.interaction.create({
        data: {
          prospectId: input.prospectId,
          userId: ctx.user.id,
          type: input.type,
          notes: input.notes ?? null,
        },
      });

      // Ao registrar o primeiro contato, avanca automaticamente um prospect
      // ainda "frio" (NEW/ENRICHED/ANALYZED) para CONTACTED.
      const CONTACT_TYPES = ["EMAIL", "WHATSAPP", "CALL", "MEETING", "PROPOSAL"] as const;
      const COLD_STATUSES = ["NEW", "ENRICHED", "ANALYZED"];
      if (
        (CONTACT_TYPES as readonly string[]).includes(input.type) &&
        COLD_STATUSES.includes(prospect.status)
      ) {
        await ctx.db.prospect.update({
          where: { id: input.prospectId },
          data: { status: "CONTACTED" },
        });
      }

      return interaction;
    }),

  // Remove uma interacao
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.organizationId;
      if (!organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Organizacao nao encontrada" });
      }

      const interaction = await ctx.db.interaction.findFirst({
        where: { id: input.id, prospect: { organizationId } },
        select: { id: true },
      });

      if (!interaction) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Interacao nao encontrada" });
      }

      await ctx.db.interaction.delete({ where: { id: input.id } });

      return { success: true };
    }),
});
