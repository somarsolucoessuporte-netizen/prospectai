import { Agent, type AgentContext, type AgentResult } from "../base/Agent";

export interface ScoutPayload {
  query: string; // Ex: "restaurantes em Fortaleza CE"
  source: ScoutSource;
  maxResults?: number;
  filters?: ScoutFilters;
}

export type ScoutSource = "google_maps" | "instagram" | "linkedin" | "manual";

export interface ScoutFilters {
  city?: string;
  state?: string;
  category?: string;
  minRating?: number;
}

export interface ScoutResult {
  source: ScoutSource;
  totalFound: number;
  prospects: RawProspect[];
}

export interface RawProspect {
  name: string;
  externalId?: string;
  source: ScoutSource;
  rawData: Record<string, unknown>;
}

/**
 * ScoutAgent — Responsavel por ENCONTRAR empresas.
 *
 * Nao enriquece dados. Nao analisa. Nao contata.
 * Apenas encontra e retorna identificadores basicos para o Collector.
 */
export class ScoutAgent extends Agent<ScoutPayload, ScoutResult> {
  readonly name = "scout";
  readonly description = "Encontra empresas e negocios a partir de fontes externas";

  async execute(payload: ScoutPayload, context: AgentContext): Promise<AgentResult<ScoutResult>> {
    this.log(`Iniciando busca: "${payload.query}" via ${payload.source}`);

    // TODO: Implementar na Fase 1 — integracao com Google Places API
    // Por ora, retorna estrutura vazia para validar a arquitetura

    return Promise.resolve({
      success: true,
      data: {
        source: payload.source,
        totalFound: 0,
        prospects: [],
      },
      metadata: {
        jobId: context.jobId,
        query: payload.query,
        executedAt: new Date().toISOString(),
      },
    });
  }
}
