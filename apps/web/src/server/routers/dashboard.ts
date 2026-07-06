import { protectedProcedure, router } from "../trpc";

interface StatusCount {
  status: string;
  count: number;
}

interface ScoreBucket {
  label: string;
  min: number;
  max: number;
  count: number;
}

/**
 * Router do Dashboard — metricas agregadas da organizacao.
 *
 * Usa agregacoes do Prisma (sem SQL raw) para manter tudo tipado e portavel.
 */
export const dashboardRouter = router({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.organizationId;

    const empty = {
      total: 0,
      withPhone: 0,
      withWebsite: 0,
      withOutreach: 0,
      analyzed: 0,
      avgScore: 0,
      byStatus: [] as StatusCount[],
      scoreBuckets: [] as ScoreBucket[],
      topOpportunities: [] as { name: string; count: number }[],
    };

    if (!organizationId) return empty;

    const where = { organizationId };

    const [total, withPhone, withWebsite, withOutreach, analyzed, scoreAgg, grouped] =
      await Promise.all([
        ctx.db.prospect.count({ where }),
        ctx.db.prospect.count({ where: { ...where, phone: { not: null } } }),
        ctx.db.prospect.count({ where: { ...where, website: { not: null } } }),
        ctx.db.prospect.count({ where: { ...where, outreachMessage: { not: null } } }),
        ctx.db.prospect.count({ where: { ...where, status: "ANALYZED" } }),
        ctx.db.prospect.aggregate({ where: { ...where, score: { not: null } }, _avg: { score: true } }),
        ctx.db.prospect.groupBy({ by: ["status"], where, _count: { _all: true } }),
      ]);

    const byStatus: StatusCount[] = grouped.map((g) => ({
      status: g.status,
      count: g._count._all,
    }));

    const bucketDefs: Omit<ScoreBucket, "count">[] = [
      { label: "0-30", min: 0, max: 30 },
      { label: "31-60", min: 31, max: 60 },
      { label: "61-80", min: 61, max: 80 },
      { label: "81-100", min: 81, max: 100 },
    ];

    const scoreBuckets: ScoreBucket[] = await Promise.all(
      bucketDefs.map(async (b) => ({
        ...b,
        count: await ctx.db.prospect.count({
          where: { ...where, score: { gte: b.min, lte: b.max } },
        }),
      }))
    );

    // Top oportunidades: agrega os arrays de opportunities em memoria.
    const withOpportunities = await ctx.db.prospect.findMany({
      where: { ...where, score: { not: null } },
      select: { opportunities: true },
      take: 1000,
    });

    const opportunityCounts = new Map<string, number>();
    for (const p of withOpportunities) {
      for (const raw of p.opportunities) {
        const key = raw.trim();
        if (!key) continue;
        opportunityCounts.set(key, (opportunityCounts.get(key) ?? 0) + 1);
      }
    }

    const topOpportunities = Array.from(opportunityCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      total,
      withPhone,
      withWebsite,
      withOutreach,
      analyzed,
      avgScore: Math.round(scoreAgg._avg.score ?? 0),
      byStatus,
      scoreBuckets,
      topOpportunities,
    };
  }),
});
