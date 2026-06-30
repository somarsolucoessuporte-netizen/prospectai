import { Agent, type AgentContext, type AgentResult } from "../base/Agent";
import type { RawProspect } from "../scout/ScoutAgent";

export interface CollectorPayload {
  prospect: RawProspect;
}

export interface CollectorResult {
  enrichedFields: Record<string, unknown>;
}

/**
 * CollectorAgent — Responsavel por COLETAR dados adicionais de um prospect.
 *
 * Recebe um RawProspect encontrado pelo ScoutAgent e busca dados
 * complementares (website, CNPJ, redes sociais). Nao analisa nem pontua.
 */
export class CollectorAgent extends Agent<CollectorPayload, CollectorResult> {
  readonly name = "collector";
  readonly description = "Coleta e enriquece dados adicionais de um prospect";

  async execute(
    payload: CollectorPayload,
    context: AgentContext
  ): Promise<AgentResult<CollectorResult>> {
    this.log(`Coletando dados para: ${payload.prospect.name}`);

    // TODO: Implementar na Fase 2 — scraping de website, CNPJ, redes sociais

    return Promise.resolve({
      success: true,
      data: {
        enrichedFields: {},
      },
      metadata: {
        jobId: context.jobId,
        executedAt: new Date().toISOString(),
      },
    });
  }
}
