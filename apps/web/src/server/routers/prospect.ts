import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../trpc";

export const prospectRouter = router({
  // Cria um job de busca para o ScoutAgent
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

      const job = await ctx.db.agentJob.create({
        data: {
          agentName: "scout",
          status: "PENDING",
          payload: { ...input, organizationId, country: "Brazil" },
        },
      });

      // Dispara o worker via API route (fire-and-forget)
      const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/worker`;
      fetch(workerUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WORKER_SECRET}`,
        },
      }).catch(() => {
        // Worker roda em background — ignora erros aqui
      });

      return { jobId: job.id, status: "PENDING" };
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

  // Lista prospects da organizacao
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        city: z.string().optional(),
        status: z
          .enum([
            "NEW",
            "ENRICHED",
            "ANALYZED",
            "CONTACTED",
            "NEGOTIATING",
            "CONVERTED",
            "LOST",
            "DISQUALIFIED",
          ])
          .optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const organizationId = ctx.organizationId;
      if (!organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Organizacao nao encontrada" });
      }

      const { page, limit, search, city, status } = input;
      const skip = (page - 1) * limit;

      const where = {
        organizationId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { city: { contains: search, mode: "insensitive" as const } },
                { category: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
        ...(city ? { city: { contains: city, mode: "insensitive" as const } } : {}),
        ...(status ? { status } : {}),
      };

      const [prospects, total] = await Promise.all([
        ctx.db.prospect.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ score: "desc" }, { createdAt: "desc" }],
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
            status: true,
            sources: true,
            createdAt: true,
          },
        }),
        ctx.db.prospect.count({ where }),
      ]);

      return {
        prospects,
        total,
        pages: Math.ceil(total / limit),
        page,
      };
    }),

  // Detalhes de um prospect
  byId: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const organizationId = ctx.organizationId;
    if (!organizationId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Organizacao nao encontrada" });
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
