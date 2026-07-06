import { AgentWorker } from "@prospectai/agents";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../trpc";

const PROSPECT_STATUS_VALUES = [
  "NEW",
  "ENRICHED",
  "ANALYZED",
  "CONTACTED",
  "NEGOTIATING",
  "CONVERTED",
  "LOST",
  "DISQUALIFIED",
] as const;

export const prospectRouter = router({
  // Cria uma SearchSession + um job de busca para o ScoutAgent
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(2, "Digite o tipo de negocio"),
        city: z.string().min(2, "Digite a cidade"),
        state: z.string().min(2, "Digite o estado"),
        maxResults: z.number().min(1).max(100).default(50),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.organizationId;

      if (!organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organizacao nao encontrada",
        });
      }

      const session = await ctx.db.searchSession.create({
        data: {
          organizationId,
          query: input.query,
          city: input.city,
          state: input.state,
        },
      });

      const job = await ctx.db.agentJob.create({
        data: {
          agentName: "scout",
          status: "PENDING",
          payload: { ...input, organizationId, sessionId: session.id, country: "Brazil" },
        },
      });

      // Processa o job aqui dentro, de forma sincrona: em serverless (Vercel)
      // a funcao e encerrada assim que a resposta e enviada, entao um fetch
      // "fire-and-forget" para /api/worker e cancelado antes de rodar.
      // Processar dentro da mesma invocacao garante que o job realmente execute.
      const overpassUrl = process.env.OSM_OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";
      const groqApiKey = process.env.GROQ_API_KEY ?? "";
      const groqModel = process.env.GROQ_MODEL ?? "llama3-70b-8192";
      const worker = new AgentWorker(overpassUrl, groqApiKey, groqModel);
      await worker.processJob(job.id);

      const finalJob = await ctx.db.agentJob.findUnique({
        where: { id: job.id },
        select: { status: true },
      });

      return { jobId: job.id, sessionId: session.id, status: finalJob?.status ?? "PENDING" };
    }),

  // Enfileira enrichment + scoring para prospects ainda sem score e drena a fila.
  // Usado pelo botao "Analisar tudo com IA" na tabela de prospects.
  enrichAll: protectedProcedure
    .input(z.object({ sessionId: z.string().optional() }).optional())
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.organizationId;
      if (!organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Organizacao nao encontrada" });
      }

      const prospects = await ctx.db.prospect.findMany({
        where: {
          organizationId,
          score: null,
          ...(input?.sessionId
            ? { searchSessions: { some: { sessionId: input.sessionId } } }
            : {}),
        },
        select: { id: true, website: true },
        take: 50,
      });

      for (const prospect of prospects) {
        if (prospect.website) {
          await ctx.db.agentJob.create({
            data: {
              agentName: "enrichment",
              status: "PENDING",
              payload: { prospectId: prospect.id, website: prospect.website },
            },
          });
        }

        await ctx.db.agentJob.create({
          data: {
            agentName: "scoring",
            status: "PENDING",
            payload: { prospectId: prospect.id },
          },
        });
      }

      const overpassUrl = process.env.OSM_OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";
      const groqApiKey = process.env.GROQ_API_KEY ?? "";
      const groqModel = process.env.GROQ_MODEL ?? "llama3-70b-8192";
      const worker = new AgentWorker(overpassUrl, groqApiKey, groqModel);
      const processed = await worker.processBatch();

      return { queued: prospects.length, processed };
    }),

  // Gera (ou regera) a mensagem de abordagem de um prospect com o WriterAgent.
  // Processa o job de forma sincrona para devolver a mensagem imediatamente.
  generateOutreach: protectedProcedure
    .input(
      z.object({
        prospectId: z.string(),
        channel: z.enum(["whatsapp", "email"]).default("whatsapp"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.organizationId;
      if (!organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Organizacao nao encontrada" });
      }

      const prospect = await ctx.db.prospect.findFirst({
        where: { id: input.prospectId, organizationId },
        select: { id: true },
      });

      if (!prospect) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prospect nao encontrado" });
      }

      const groqApiKey = process.env.GROQ_API_KEY ?? "";
      if (!groqApiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "GROQ_API_KEY nao configurada",
        });
      }

      const job = await ctx.db.agentJob.create({
        data: {
          agentName: "writer",
          status: "PENDING",
          payload: { prospectId: input.prospectId, channel: input.channel },
        },
      });

      const overpassUrl = process.env.OSM_OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";
      const groqModel = process.env.GROQ_MODEL ?? "llama3-70b-8192";
      const worker = new AgentWorker(overpassUrl, groqApiKey, groqModel);
      await worker.processJob(job.id);

      const updated = await ctx.db.prospect.findUnique({
        where: { id: input.prospectId },
        select: { id: true, outreachMessage: true, outreachAt: true },
      });

      return {
        prospectId: input.prospectId,
        outreachMessage: updated?.outreachMessage ?? null,
      };
    }),

  // Verifica o status de um job
  jobStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input, ctx }) => {
      const job = await ctx.db.agentJob.findUnique({
        where: { id: input.jobId },
        select: {
          id: true,
          status: true,
          error: true,
          createdAt: true,
          completedAt: true,
        },
      });

      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job nao encontrado" });
      }

      return job;
    }),

  // Lista as sessoes de busca da organizacao (abas), mais recente primeiro
  sessions: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.organizationId;
    if (!organizationId) return [];

    const sessions = await ctx.db.searchSession.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        query: true,
        city: true,
        state: true,
        totalFound: true,
        createdAt: true,
        _count: { select: { prospects: true } },
      },
    });

    return sessions.map((s) => ({
      id: s.id,
      query: s.query,
      city: s.city,
      state: s.state,
      totalFound: s.totalFound,
      createdAt: s.createdAt,
      count: s._count.prospects,
    }));
  }),

  // Lista os prospects de uma sessao de busca especifica (conteudo da aba)
  bySession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(200).default(100),
      })
    )
    .query(async ({ input, ctx }) => {
      const organizationId = ctx.organizationId;
      const { sessionId, page, limit } = input;

      if (!organizationId) {
        return { prospects: [], total: 0, pages: 0, page };
      }

      const session = await ctx.db.searchSession.findFirst({
        where: { id: sessionId, organizationId },
        select: { id: true },
      });

      if (!session) {
        return { prospects: [], total: 0, pages: 0, page };
      }

      const skip = (page - 1) * limit;

      const [links, total] = await Promise.all([
        ctx.db.searchSessionProspect.findMany({
          where: { sessionId },
          skip,
          take: limit,
          orderBy: { prospect: { score: "desc" } },
          select: {
            prospect: {
              select: {
                id: true,
                name: true,
                category: true,
                address: true,
                city: true,
                state: true,
                phone: true,
                website: true,
                googleRating: true,
                googleReviews: true,
                score: true,
                scoreReason: true,
                outreachMessage: true,
                status: true,
                sources: true,
                createdAt: true,
              },
            },
          },
        }),
        ctx.db.searchSessionProspect.count({ where: { sessionId } }),
      ]);

      return {
        prospects: links.map((l) => l.prospect),
        total,
        pages: Math.ceil(total / limit),
        page,
      };
    }),

  // Exclui uma sessao de busca e os prospects que pertencem exclusivamente a ela
  deleteSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.organizationId;
      if (!organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Organizacao nao encontrada" });
      }

      const session = await ctx.db.searchSession.findFirst({
        where: { id: input.sessionId, organizationId },
        select: { id: true },
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Busca nao encontrada" });
      }

      const links = await ctx.db.searchSessionProspect.findMany({
        where: { sessionId: input.sessionId },
        select: { prospectId: true },
      });
      const prospectIds = links.map((l) => l.prospectId);

      // Prospects que tambem pertencem a OUTRAS sessoes nao devem ser apagados
      const sharedLinks = await ctx.db.searchSessionProspect.findMany({
        where: { prospectId: { in: prospectIds }, sessionId: { not: input.sessionId } },
        select: { prospectId: true },
      });
      const sharedIds = new Set(sharedLinks.map((l) => l.prospectId));
      const exclusiveIds = prospectIds.filter((id) => !sharedIds.has(id));

      await ctx.db.$transaction([
        ctx.db.prospect.deleteMany({ where: { id: { in: exclusiveIds } } }),
        ctx.db.searchSession.delete({ where: { id: input.sessionId } }),
      ]);

      return { success: true };
    }),

  // Lista prospects para o quadro de pipeline (CRM), agrupados por status no cliente.
  // Prioriza os de maior score para aparecerem no topo de cada coluna.
  pipeline: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(1000).default(500) }).optional())
    .query(async ({ input, ctx }) => {
      const organizationId = ctx.organizationId;
      if (!organizationId) return [];

      return ctx.db.prospect.findMany({
        where: { organizationId },
        orderBy: [{ score: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
        take: input?.limit ?? 500,
        select: {
          id: true,
          name: true,
          category: true,
          city: true,
          state: true,
          phone: true,
          score: true,
          status: true,
          outreachMessage: true,
        },
      });
    }),

  // Atualiza o status de um prospect (ex.: Novo -> Contatado)
  updateStatus: protectedProcedure
    .input(z.object({ id: z.string(), status: z.enum(PROSPECT_STATUS_VALUES) }))
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.organizationId;
      if (!organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Organizacao nao encontrada" });
      }

      const prospect = await ctx.db.prospect.findFirst({
        where: { id: input.id, organizationId },
        select: { id: true },
      });

      if (!prospect) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prospect nao encontrado" });
      }

      return ctx.db.prospect.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  // Remove um prospect
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.organizationId;
      if (!organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Organizacao nao encontrada" });
      }

      const prospect = await ctx.db.prospect.findFirst({
        where: { id: input.id, organizationId },
        select: { id: true },
      });

      if (!prospect) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prospect nao encontrado" });
      }

      await ctx.db.prospect.delete({ where: { id: input.id } });

      return { success: true };
    }),

  // Detalhes de um prospect
  byId: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const organizationId = ctx.organizationId;

    // Organizacao ainda nao provisionada — trata como "nao encontrado",
    // igual a um prospect que nao existe.
    if (!organizationId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Prospect nao encontrado" });
    }

    const prospect = await ctx.db.prospect.findFirst({
      where: {
        id: input.id,
        organizationId,
      },
      include: {
        tags: { include: { tag: true } },
        interactions: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    if (!prospect) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Prospect nao encontrado" });
    }

    return prospect;
  }),
});
