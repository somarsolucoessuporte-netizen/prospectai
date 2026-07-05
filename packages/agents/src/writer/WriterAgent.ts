import Groq from "groq-sdk";
import { prisma } from "@prospectai/database";

import { Agent, type AgentContext, type AgentResult } from "../base/Agent";

export interface WriterPayload {
  prospectId: string;
  channel?: OutreachChannel;
}

export type OutreachChannel = "whatsapp" | "email";

export interface WriterResult {
  prospectId: string;
  channel: OutreachChannel;
  message: string;
}

interface ProspectForWriter {
  name: string;
  category: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  instagramUrl: string | null;
  score: number | null;
  scoreReason: string | null;
  opportunities: string[];
  suggestedApproach: string | null;
}

/**
 * WriterAgent — Gera a mensagem de abordagem personalizada de um prospect.
 *
 * Usa Llama 3 (Groq, gratuito) e parte da analise ja produzida pelo
 * ScoringAgent (score, oportunidades, abordagem sugerida) para escrever
 * uma mensagem pronta para envio. Nao pontua nem coleta — apenas redige.
 *
 * Responsabilidade unica: transformar a analise comercial em texto de contato.
 */
export class WriterAgent extends Agent<WriterPayload, WriterResult> {
  readonly name = "writer";
  readonly description = "Gera mensagens de abordagem personalizadas (Groq/Llama 3)";

  private readonly groq: Groq;
  private readonly model: string;

  constructor(apiKey: string, model = "llama3-70b-8192") {
    super();
    this.groq = new Groq({ apiKey });
    this.model = model;
  }

  async execute(
    payload: WriterPayload,
    context: AgentContext
  ): Promise<AgentResult<WriterResult>> {
    const { prospectId, channel = "whatsapp" } = payload;

    this.log(`Gerando abordagem (${channel}) para prospect: ${prospectId}`);

    try {
      const prospect = await prisma.prospect.findUnique({
        where: { id: prospectId },
        select: {
          name: true,
          category: true,
          city: true,
          state: true,
          website: true,
          instagramUrl: true,
          score: true,
          scoreReason: true,
          opportunities: true,
          suggestedApproach: true,
        },
      });

      if (!prospect) {
        throw new Error(`Prospect nao encontrado: ${prospectId}`);
      }

      const completion = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: this.systemPrompt(channel) },
          { role: "user", content: this.buildPrompt(prospect, channel) },
        ],
        max_tokens: 600,
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content ?? "{}";
      const message = this.parseMessage(content, prospect, channel);

      await prisma.prospect.update({
        where: { id: prospectId },
        data: { outreachMessage: message, outreachAt: new Date() },
      });

      this.log(`Abordagem gerada (${message.length} caracteres)`);

      return {
        success: true,
        data: { prospectId, channel, message },
        metadata: { jobId: context.jobId, executedAt: new Date().toISOString() },
      };
    } catch (error) {
      this.logError("Falha na geracao da abordagem", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  private systemPrompt(channel: OutreachChannel): string {
    const channelHint =
      channel === "whatsapp"
        ? "A mensagem sera enviada por WhatsApp: curta (ate 4 frases), calorosa, sem assunto de email, sem links, pronta para colar."
        : "A mensagem sera enviada por email: inclua uma linha de assunto curta e um corpo de ate 6 frases.";

    return `Voce e um consultor comercial da Somar Solucoes Digitais, empresa brasileira de tecnologia de Fortaleza que oferece sites, sistemas, automacao com IA, chatbots, gestao de presenca digital e e-commerce.

Escreva uma mensagem de primeiro contato em portugues do Brasil, tom consultivo e humano (nunca robotico ou spam). Foque em uma oportunidade concreta e util para o negocio do prospect, sem prometer o impossivel e sem parecer generica. ${channelHint}

Responda APENAS em JSON valido: {"message": "<texto pronto para envio>"}`;
  }

  private buildPrompt(prospect: ProspectForWriter, channel: OutreachChannel): string {
    const opportunities =
      prospect.opportunities.length > 0
        ? prospect.opportunities.map((o) => `- ${o}`).join("\n")
        : "- (nenhuma oportunidade listada; deduza a partir dos dados)";

    return `Gere a mensagem de abordagem (${channel}) para esta empresa:

- Nome: ${prospect.name}
- Categoria: ${prospect.category ?? "Nao informada"}
- Cidade: ${prospect.city ?? "Nao informada"}, ${prospect.state ?? ""}
- Website: ${prospect.website ?? "NAO TEM SITE"}
- Instagram: ${prospect.instagramUrl ?? "NAO TEM"}
- Score comercial: ${prospect.score ?? "nao calculado"}/100
- Diagnostico: ${prospect.scoreReason ?? "nao disponivel"}
- Abordagem sugerida pela analise: ${prospect.suggestedApproach ?? "nao disponivel"}

Oportunidades identificadas:
${opportunities}

Escreva chamando a empresa pelo nome e citando de forma natural a oportunidade mais relevante.`;
  }

  private parseMessage(
    content: string,
    prospect: ProspectForWriter,
    channel: OutreachChannel
  ): string {
    try {
      const parsed = JSON.parse(content) as { message?: unknown };
      if (typeof parsed.message === "string" && parsed.message.trim().length > 0) {
        return parsed.message.trim();
      }
    } catch {
      // Cai no fallback abaixo
    }

    if (prospect.suggestedApproach && prospect.suggestedApproach.length > 0) {
      return prospect.suggestedApproach;
    }

    const greeting = channel === "email" ? "Assunto: Presenca digital\n\nOla" : "Ola";
    return `${greeting}, ${prospect.name}! Somos da Somar Solucoes Digitais e ajudamos empresas como a sua a fortalecer a presenca digital. Podemos conversar sobre como atrair mais clientes?`;
  }
}
