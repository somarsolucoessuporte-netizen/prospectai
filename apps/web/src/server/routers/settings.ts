import { randomBytes } from "node:crypto";

import { TRPCError } from "@trpc/server";

import { protectedProcedure, router } from "../trpc";

function generateApiKey(): string {
  return `pai_${randomBytes(24).toString("hex")}`;
}

/**
 * Router de Configuracoes — dados e credenciais da organizacao.
 *
 * A chave de API habilita a API publica de leitura (/api/v1/prospects),
 * usada por integracoes externas (n8n, webhooks, planilhas).
 */
export const settingsRouter = router({
  // Retorna os dados da organizacao + status da chave de API
  organization: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.organizationId;
    if (!organizationId) return null;

    const org = await ctx.db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true, apiKey: true, createdAt: true },
    });

    return org;
  }),

  // Gera (ou regenera) a chave de API da organizacao
  regenerateApiKey: protectedProcedure.mutation(async ({ ctx }) => {
    const organizationId = ctx.organizationId;
    if (!organizationId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Organizacao nao encontrada" });
    }

    const apiKey = generateApiKey();

    await ctx.db.organization.update({
      where: { id: organizationId },
      data: { apiKey },
    });

    return { apiKey };
  }),

  // Revoga a chave de API (desativa a API publica)
  revokeApiKey: protectedProcedure.mutation(async ({ ctx }) => {
    const organizationId = ctx.organizationId;
    if (!organizationId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Organizacao nao encontrada" });
    }

    await ctx.db.organization.update({
      where: { id: organizationId },
      data: { apiKey: null },
    });

    return { success: true };
  }),
});
