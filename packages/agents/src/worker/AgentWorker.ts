import { prisma, type AgentJob, type Prisma } from "@prospectai/database";

import { CollectorAgent, type CollectorPayload } from "../collector/CollectorAgent";
import { EnrichmentAgent, type EnrichmentPayload } from "../enrichment/EnrichmentAgent";
import { ScoringAgent, type ScoringPayload } from "../scoring/ScoringAgent";
import { ProspectPersistenceService } from "../services/ProspectPersistenceService";
import { ScoutAgent, type ScoutPayload, type ScoutResult } from "../scout/ScoutAgent";
import type { AgentResult } from "../base/Agent";

/**
 * AgentWorker — processa jobs da fila AgentJob.
 *
 * Design simples para MVP: sem loop de polling em background (nao ha um
 * processo Node de longa duracao no ambiente serverless da Vercel). Cada
 * job e processado de forma sincrona dentro da requisicao que o dispara
 * (ver prospect.ts#search e prospect.ts#enrichAll). processNext() e
 * processBatch() ficam disponiveis para drenar a fila sob demanda.
 *
 * Pipeline da Fase 2:
 *   scout -> (persiste prospects) -> enfileira scoring + enrichment por prospect
 *   enrichment -> extrai contato do website
 *   scoring   -> gera score 0-100 com Groq/Llama 3
 *   collector -> busca CNPJ (disponivel, acionado sob demanda)
 */
export class AgentWorker {
  private readonly persistenceService: ProspectPersistenceService;
  private readonly overpassUrl: string;
  private readonly groqApiKey: string;
  private readonly groqModel: string;

  constructor(
    overpassUrl = "https://overpass-api.de/api/interpreter",
    groqApiKey = "",
    groqModel = "llama3-70b-8192"
  ) {
    this.overpassUrl = overpassUrl;
    this.groqApiKey = groqApiKey;
    this.groqModel = groqModel;
    this.persistenceService = new ProspectPersistenceService();
  }

  /** Processa o job pendente mais antigo da fila. */
  async processNext(): Promise<boolean> {
    const job = await prisma.agentJob.findFirst({
      where: {
        status: "PENDING",
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
      },
      orderBy: { createdAt: "asc" },
    });

    if (!job) return false;

    return this.runJob(job);
  }

  /**
   * Drena a fila processando ate `maxJobs` jobs, respeitando um orcamento de
   * tempo (`maxMillis`) para nao estourar o limite da funcao serverless.
   * Retorna quantos jobs foram processados.
   */
  async processBatch(maxJobs = 8, maxMillis = 45_000): Promise<number> {
    const deadline = Date.now() + maxMillis;
    let processed = 0;

    while (processed < maxJobs && Date.now() < deadline) {
      const advanced = await this.processNext();
      if (!advanced) break;
      processed++;
    }

    return processed;
  }

  /** Processa um job especifico, se ainda estiver pendente. */
  async processJob(jobId: string): Promise<boolean> {
    const job = await prisma.agentJob.findUnique({ where: { id: jobId } });

    if (!job || job.status !== "PENDING") return false;

    return this.runJob(job);
  }

  private async runJob(job: AgentJob): Promise<boolean> {
    await prisma.agentJob.update({
      where: { id: job.id },
      data: { status: "RUNNING", startedAt: new Date(), attempts: { increment: 1 } },
    });

    try {
      const payload = job.payload as Record<string, unknown>;
      const result = await this.dispatch(job, payload);

      if (!result.success) {
        throw new Error(result.error ?? "Erro desconhecido no agente");
      }

      await prisma.agentJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          result: result as unknown as Prisma.InputJsonValue,
        },
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      const shouldRetry = job.attempts < job.maxAttempts;

      await prisma.agentJob.update({
        where: { id: job.id },
        data: {
          status: shouldRetry ? "PENDING" : "FAILED",
          error: errorMessage,
          scheduledAt: shouldRetry ? new Date(Date.now() + 30_000 * job.attempts) : null,
        },
      });

      return false;
    }
  }

  private async dispatch(
    job: AgentJob,
    payload: Record<string, unknown>
  ): Promise<AgentResult> {
    switch (job.agentName) {
      case "scout":
        return this.runScout(job, payload);

      case "collector": {
        const agent = new CollectorAgent();
        return agent.execute(payload as unknown as CollectorPayload, {
          organizationId: "",
          jobId: job.id,
          payload,
        });
      }

      case "enrichment": {
        const agent = new EnrichmentAgent();
        return agent.execute(payload as unknown as EnrichmentPayload, {
          organizationId: "",
          jobId: job.id,
          payload,
        });
      }

      case "scoring": {
        if (!this.groqApiKey) {
          throw new Error("GROQ_API_KEY nao configurada");
        }
        const agent = new ScoringAgent(this.groqApiKey, this.groqModel);
        return agent.execute(payload as unknown as ScoringPayload, {
          organizationId: "",
          jobId: job.id,
          payload,
        });
      }

      default:
        throw new Error(`Agente desconhecido: ${job.agentName}`);
    }
  }

  private async runScout(
    job: AgentJob,
    payload: Record<string, unknown>
  ): Promise<AgentResult<ScoutResult>> {
    const agent = new ScoutAgent(this.overpassUrl);
    const organizationId = (payload.organizationId as string | undefined) ?? "";
    const sessionId = payload.sessionId as string | undefined;

    const result = await agent.execute(payload as unknown as ScoutPayload, {
      organizationId,
      jobId: job.id,
      payload,
    });

    if (!result.success || !result.data) {
      return result;
    }

    const scoutData: ScoutResult = result.data;
    const persistResult = await this.persistenceService.persistMany(
      organizationId,
      sessionId,
      scoutData.prospects
    );
    console.log(
      `[AgentWorker] Persistidos: ${persistResult.created} criados, ${persistResult.skipped} ignorados`
    );

    if (sessionId) {
      await prisma.searchSession.update({
        where: { id: sessionId },
        data: { totalFound: persistResult.prospects.length },
      });
    }

    await this.enqueueEnrichmentPipeline(persistResult.prospects);

    return result;
  }

  /**
   * Enfileira os jobs de enriquecimento e scoring para os prospects recem
   * persistidos. Enrichment vem antes de scoring na fila para que o score
   * ja considere os dados extraidos do website.
   */
  private async enqueueEnrichmentPipeline(
    prospects: { id: string; website: string | null }[]
  ): Promise<void> {
    for (const prospect of prospects) {
      if (prospect.website) {
        await prisma.agentJob.create({
          data: {
            agentName: "enrichment",
            status: "PENDING",
            payload: { prospectId: prospect.id, website: prospect.website },
          },
        });
      }

      if (this.groqApiKey) {
        await prisma.agentJob.create({
          data: {
            agentName: "scoring",
            status: "PENDING",
            payload: { prospectId: prospect.id },
          },
        });
      }
    }
  }
}
