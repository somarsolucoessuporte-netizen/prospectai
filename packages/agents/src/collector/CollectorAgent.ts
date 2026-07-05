import { prisma, type Prisma } from "@prospectai/database";

import { Agent, type AgentContext, type AgentResult } from "../base/Agent";

export interface CollectorPayload {
  prospectId: string;
  prospectName: string;
  city: string;
  state: string;
}

export interface CnpjData {
  cnpj: string | null;
  razaoSocial: string | null;
  nomeFantasia: string | null;
  telefone: string | null;
  email: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cep: string | null;
  situacao: string | null;
  abertura: string | null;
  capital: string | null;
  socios: string[];
}

export interface CollectorResult {
  prospectId: string;
  cnpjFound: boolean;
  data: CnpjData | null;
}

/**
 * CollectorAgent — Coleta dados de CNPJ via ReceitaWS e Brasil API.
 *
 * Gratuito, sem chave de API, sem cartao. Busca pelo nome da empresa +
 * cidade para tentar encontrar o CNPJ correto e, em seguida, os detalhes
 * cadastrais. Nao analisa nem pontua — apenas coleta e persiste.
 *
 * Responsabilidade unica: enriquecer o prospect com dados de CNPJ.
 */
export class CollectorAgent extends Agent<CollectorPayload, CollectorResult> {
  readonly name = "collector";
  readonly description = "Coleta dados de CNPJ via ReceitaWS e Brasil API";

  private readonly receitaWsUrl: string;
  private readonly brasilApiUrl: string;

  constructor(
    receitaWsUrl = "https://receitaws.com.br/v1/cnpj",
    brasilApiUrl = "https://brasilapi.com.br/api/cnpj/v1"
  ) {
    super();
    this.receitaWsUrl = receitaWsUrl;
    this.brasilApiUrl = brasilApiUrl;
  }

  async execute(
    payload: CollectorPayload,
    context: AgentContext
  ): Promise<AgentResult<CollectorResult>> {
    const { prospectId, prospectName, city, state } = payload;

    this.log(`Coletando CNPJ para: "${prospectName}" em ${city}/${state}`);

    try {
      const cnpj = await this.searchCnpjByName(prospectName, city, state);

      if (!cnpj) {
        this.log(`CNPJ nao encontrado para: "${prospectName}"`);

        await prisma.prospect.update({
          where: { id: prospectId },
          data: { status: "ENRICHED", enrichedAt: new Date() },
        });

        return {
          success: true,
          data: { prospectId, cnpjFound: false, data: null },
          metadata: { jobId: context.jobId, executedAt: new Date().toISOString() },
        };
      }

      const cnpjData = await this.fetchCnpjDetails(cnpj);

      if (cnpjData) {
        const data: Prisma.ProspectUpdateInput = {
          cnpj: cnpjData.cnpj,
          status: "ENRICHED",
          enrichedAt: new Date(),
        };
        if (cnpjData.telefone) data.phone = cnpjData.telefone;
        if (cnpjData.email) data.email = cnpjData.email;

        await prisma.prospect.update({ where: { id: prospectId }, data });

        this.log(`CNPJ encontrado: ${cnpjData.cnpj} — ${cnpjData.razaoSocial ?? ""}`);
      } else {
        await prisma.prospect.update({
          where: { id: prospectId },
          data: { status: "ENRICHED", enrichedAt: new Date() },
        });
      }

      return {
        success: true,
        data: { prospectId, cnpjFound: cnpjData !== null, data: cnpjData },
        metadata: { jobId: context.jobId, executedAt: new Date().toISOString() },
      };
    } catch (error) {
      this.logError("Falha na coleta", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  /**
   * Tenta descobrir o CNPJ a partir do nome + cidade/UF via Brasil API.
   *
   * Nem toda empresa e localizavel por nome nas bases publicas gratuitas,
   * entao a ausencia de resultado e um caminho normal (retorna null).
   */
  private async searchCnpjByName(
    name: string,
    city: string,
    state: string
  ): Promise<string | null> {
    try {
      const query = encodeURIComponent(name);
      const url = `${this.brasilApiUrl}/search?query=${query}&municipio=${encodeURIComponent(
        city
      )}&uf=${encodeURIComponent(state)}`;

      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) return null;

      const data = (await response.json()) as { cnpj?: string }[];
      const first = Array.isArray(data) ? data[0] : undefined;

      if (first?.cnpj) {
        return first.cnpj.replace(/\D/g, "");
      }

      return null;
    } catch {
      return null;
    }
  }

  private async fetchCnpjDetails(cnpj: string): Promise<CnpjData | null> {
    // Tenta ReceitaWS primeiro
    try {
      const response = await fetch(`${this.receitaWsUrl}/${cnpj}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      });

      if (response.ok) {
        const data = (await response.json()) as Record<string, unknown>;

        if (data.status !== "ERROR") {
          return {
            cnpj,
            razaoSocial: this.asString(data.nome),
            nomeFantasia: this.asString(data.fantasia),
            telefone: this.formatPhone(this.asString(data.telefone)),
            email: this.asString(data.email)?.toLowerCase() ?? null,
            logradouro: this.asString(data.logradouro),
            numero: this.asString(data.numero),
            bairro: this.asString(data.bairro),
            cep: this.asString(data.cep),
            situacao: this.asString(data.situacao),
            abertura: this.asString(data.abertura),
            capital: this.asString(data.capital_social),
            socios: this.extractSocios(data.qsa),
          };
        }
      }
    } catch {
      // Segue para o fallback da Brasil API
    }

    // Fallback: Brasil API
    try {
      const response = await fetch(`${this.brasilApiUrl}/${cnpj}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      });

      if (response.ok) {
        const data = (await response.json()) as Record<string, unknown>;

        return {
          cnpj,
          razaoSocial: this.asString(data.razao_social),
          nomeFantasia: this.asString(data.nome_fantasia),
          telefone: this.formatPhone(this.asString(data.ddd_telefone_1)),
          email: this.asString(data.email)?.toLowerCase() ?? null,
          logradouro: this.asString(data.logradouro),
          numero: this.asString(data.numero),
          bairro: this.asString(data.bairro),
          cep: this.asString(data.cep),
          situacao: this.asString(data.descricao_situacao_cadastral),
          abertura: this.asString(data.data_inicio_atividade),
          capital: this.asString(data.capital_social),
          socios: [],
        };
      }
    } catch {
      return null;
    }

    return null;
  }

  private asString(value: unknown): string | null {
    if (typeof value === "string" && value.length > 0) return value;
    if (typeof value === "number") return String(value);
    return null;
  }

  private formatPhone(phone: string | null): string | null {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 0) return null;
    if (digits.length === 10) {
      return `+55 ${digits.slice(0, 2)} ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11) {
      return `+55 ${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return phone;
  }

  private extractSocios(qsa: unknown): string[] {
    if (!Array.isArray(qsa)) return [];
    return qsa
      .map((s: unknown): string | null => {
        if (typeof s === "object" && s !== null && "nome" in s) {
          return String((s as Record<string, unknown>).nome);
        }
        return null;
      })
      .filter((s): s is string => s !== null);
  }
}
