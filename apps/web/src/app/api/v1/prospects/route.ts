import { prisma, ProspectStatus, type Prisma } from "@prospectai/database";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PROSPECT_STATUSES = new Set<string>(Object.values(ProspectStatus));

/**
 * API publica de leitura — GET /api/v1/prospects
 *
 * Autenticacao por chave de API da organizacao:
 *   Authorization: Bearer <apiKey>   (ou header x-api-key)
 *
 * Somente leitura. Habilita integracoes externas (n8n, webhooks, planilhas)
 * a consumir os prospects de uma organizacao sem acesso ao painel.
 *
 * Query params: status, minScore (0-100), limit (1-200), offset.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const apiKey = extractApiKey(request);

  if (!apiKey) {
    return NextResponse.json(
      { error: "Chave de API ausente. Envie Authorization: Bearer <apiKey>." },
      { status: 401 }
    );
  }

  const organization = await prisma.organization.findUnique({
    where: { apiKey },
    select: { id: true },
  });

  if (!organization) {
    return NextResponse.json({ error: "Chave de API invalida." }, { status: 401 });
  }

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status")?.toUpperCase();
  const status = statusParam && PROSPECT_STATUSES.has(statusParam) ? statusParam : undefined;

  const minScore = clampInt(url.searchParams.get("minScore"), 0, 100);
  const limit = clampInt(url.searchParams.get("limit"), 1, 200) ?? 50;
  const offset = clampInt(url.searchParams.get("offset"), 0, 100_000) ?? 0;

  const where: Prisma.ProspectWhereInput = {
    organizationId: organization.id,
    ...(status ? { status: status as ProspectStatus } : {}),
    ...(minScore !== undefined ? { score: { gte: minScore } } : {}),
  };

  const [total, prospects] = await Promise.all([
    prisma.prospect.count({ where }),
    prisma.prospect.findMany({
      where,
      orderBy: [{ score: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
      select: {
        id: true,
        name: true,
        category: true,
        city: true,
        state: true,
        phone: true,
        email: true,
        website: true,
        cnpj: true,
        instagramUrl: true,
        facebookUrl: true,
        score: true,
        scoreReason: true,
        opportunities: true,
        suggestedApproach: true,
        outreachMessage: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    data: prospects,
    pagination: { total, limit, offset, count: prospects.length },
  });
}

function extractApiKey(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length).trim();
  }
  const header = request.headers.get("x-api-key")?.trim();
  return header && header.length > 0 ? header : null;
}

function clampInt(value: string | null, min: number, max: number): number | undefined {
  if (value === null) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return undefined;
  return Math.min(max, Math.max(min, parsed));
}
