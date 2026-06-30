import { Agent, type AgentContext, type AgentResult } from "../base/Agent";

export interface AnalystPayload {
  prospectId: string;
  data: Record<string, unknown>;
}

export interface AnalystResult {
  summary: string;
  opportunities: string[];
}

/**
 * AnalystAgent — Responsavel por ANALISAR a oportunidade de negocio.
 *
 * Interpreta os dados coletados pelo CollectorAgent e identifica
 * oportunidades comerciais. Nao gera score nem mensagens.
 */
export class AnalystAgent extends Agent<AnalystPayload, AnalystResult> {
  readonly name = "analyst";
  readonly description = "Analisa dados coletados e identifica oportunidades comerciais";

  async execute(
    payload: AnalystPayload,
    context: AgentContext
  ): Promise<AgentResult<AnalystResult>> {
    this.log(`Analisando prospect: ${payload.prospectId}`);

    // TODO: Implementar na Fase 3 — analise com IA (Claude/GPT)

    return Promise.resolve({
      success: true,
      data: {
        summary: "",
        opportunities: [],
      },
      metadata: {
        jobId: context.jobId,
        executedAt: new Date().toISOString(),
      },
    });
  }
}
