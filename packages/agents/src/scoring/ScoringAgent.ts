import Groq from "groq-sdk";
import { prisma } from "@prospectai/database";

import { Agent, type AgentContext, type AgentResult } from "../base/Agent";

export interface ScoringPayload {
  prospectId: string;
}

export interface ScoringResult {
  prospectId: string;
  score: number;
  reason: string;
  opportunities: string[];
  suggestedApproach: string;
}

interface ProspectForScoring {
  name: string;
  category: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  googleRating: number | null;
  googleReviews: number | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  cnpj: string | null;
}

interface ParsedScore {
  score?: number;
  reason?: string;
  opportunities?: string[];
  suggestedApproach?: string;
}

/**
 * ScoringAgent — Analisa o prospect e gera um score comercial 0-100 com Groq.
 *
 * Usa Llama 3 (gratuito) para avaliar presenca digital e identificar
 * oportunidades. O score representa o potencial comercial da empresa como
 * cliente da Somar Solucoes Digitais.
 *
 * Responsabilidade unica: pontuar o prospect a partir dos dados ja coletados.
 */
export class ScoringAgent extends Agent<ScoringPayload, ScoringResult> {
  readonly name = "scoring";
  readonly description = "Gera score comercial 0-100 usando IA (Groq/Llama 3)";

  private readonly groq: Groq;
  private readonly model: string;

  constructor(apiKey: string, model = "llama3-70b-8192") {
    super();
    this.groq = new Groq({ apiKey });
    this.model = model;
  }

  async execute(
    payload: ScoringPayload,
    context: AgentContext
  ): Promise<AgentResult<ScoringResult>> {
    const { prospectId } = payload;

    this.log(`Gerando score para prospect: ${prospectId}`);

    try {
      const prospect = await prisma.prospect.findUnique({
        where: { id: prospectId },
        select: {
          name: true,
          category: true,
          city: true,
          state: true,
          website: true,
          phone: true,
          email: true,
          googleRating: true,
          googleReviews: true,
          instagramUrl: true,
          facebookUrl: true,
          cnpj: true,
        },
      });

      if (!prospect) {
        throw new Error(`Prospect nao encontrado: ${prospectId}`);
      }

      const prompt = this.buildPrompt(prospect);

      const completion = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        max_tokens: 1000,
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content ?? "{}";
      const parsed = this.parse(content);

      const result: ScoringResult = {
        prospectId,
        score: Math.min(100, Math.max(0, Math.round(parsed.score ?? 30))),
        reason: parsed.reason ?? "Score calculado automaticamente",
        opportunities: parsed.opportunities ?? [],
        suggestedApproach: parsed.suggestedApproach ?? "",
      };

      await prisma.prospect.update({
        where: { id: prospectId },
        data: {
          score: result.score,
          scoreReason: result.reason,
          status: "ANALYZED",
        },
      });

      this.log(`Score gerado: ${result.score}/100 — ${result.reason}`);

      return {
        success: true,
        data: result,
        metadata: { jobId: context.jobId, executedAt: new Date().toISOString() },
      };
    } catch (error) {
      this.logError("Falha no scoring", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  private parse(content: string): ParsedScore {
    try {
      return JSON.parse(content) as ParsedScore;
    } catch {
      return { score: 30, reason: "Analise nao disponivel", opportunities: [], suggestedApproach: "" };
    }
  }

  private buildPrompt(prospect: ProspectForScoring): string {
    return `Analise esta empresa brasileira e gere um score de oportunidade comercial para venda de servicos digitais:

DADOS DA EMPRESA:
- Nome: ${prospect.name}
- Categoria: ${prospect.category ?? "Nao informado"}
- Cidade: ${prospect.city ?? "Nao informada"}, ${prospect.state ?? ""}
- Website: ${prospect.website ?? "NAO TEM SITE"}
- Telefone: ${prospect.phone ?? "Nao encontrado"}
- Email: ${prospect.email ?? "Nao encontrado"}
- Nota Google: ${prospect.googleRating ?? "Nao avaliado"} (${prospect.googleReviews ?? 0} avaliacoes)
- Instagram: ${prospect.instagramUrl ?? "NAO TEM"}
- Facebook: ${prospect.facebookUrl ?? "NAO TEM"}
- CNPJ: ${prospect.cnpj ?? "Nao encontrado"}

CRITERIOS DE SCORE (0-100):
- 0-30: Baixo potencial (empresa fechada, sem contato, inacessivel)
- 31-50: Potencial moderado (empresa ativa mas bem estruturada digitalmente)
- 51-70: Bom potencial (empresa ativa com gaps digitais identificados)
- 71-90: Alto potencial (empresa ativa com grandes oportunidades digitais)
- 91-100: Oportunidade critica (empresa sem presenca digital, alto faturamento estimado)

FATORES QUE AUMENTAM O SCORE:
- Sem website ou site desatualizado (+30 pontos)
- Sem Instagram ou redes sociais (+20 pontos)
- Muitas avaliacoes no Google (empresa movimentada) (+15 pontos)
- Categoria com alto ticket medio (clinicas, imobiliarias, academias) (+10 pontos)
- CNPJ ativo e empresa estabelecida (+10 pontos)

Responda APENAS com este JSON:
{
  "score": <numero 0-100>,
  "reason": "<explicacao objetiva em 1 frase do score>",
  "opportunities": ["<oportunidade 1>", "<oportunidade 2>", "<oportunidade 3>"],
  "suggestedApproach": "<mensagem de abordagem personalizada em portugues, 2-3 frases, tom consultivo>"
}`;
  }
}

const SYSTEM_PROMPT = `Voce e um especialista em inteligencia comercial digital da Somar Solucoes Digitais,
uma empresa brasileira de tecnologia baseada em Fortaleza que oferece:
- Sites profissionais e landing pages
- Sistemas web e aplicativos
- Automacao com IA e chatbots
- Gestao de presenca digital
- E-commerce e lojas virtuais

Analise empresas brasileiras e identifique oportunidades reais de venda de servicos digitais.
Responda APENAS em JSON valido, sem markdown, sem texto adicional.`;
