import { Agent, type AgentContext, type AgentResult } from "../base/Agent";

export interface ScoringPayload {
  prospectId: string;
  opportunities: string[];
}

export interface ScoringResult {
  score: number; // 0-100
  reason: string;
}

/**
 * ScoringAgent — Responsavel por gerar o SCORE comercial de um prospect.
 *
 * Recebe as oportunidades identificadas pelo AnalystAgent e calcula
 * um score de 0 a 100 com justificativa. Nao analisa dados brutos.
 */
export class ScoringAgent extends Agent<ScoringPayload, ScoringResult> {
  readonly name = "scoring";
  readonly description = "Calcula o score comercial (0-100) de um prospect";

  async execute(
    payload: ScoringPayload,
    context: AgentContext
  ): Promise<AgentResult<ScoringResult>> {
    this.log(`Calculando score para: ${payload.prospectId}`);

    // TODO: Implementar na Fase 3 — algoritmo de scoring com IA

    return Promise.resolve({
      success: true,
      data: {
        score: 0,
        reason: "",
      },
      metadata: {
        jobId: context.jobId,
        executedAt: new Date().toISOString(),
      },
    });
  }
}
