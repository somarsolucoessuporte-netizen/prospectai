import { prisma, type Prisma } from "@prospectai/database";

import { ProspectPersistenceService } from "../services/ProspectPersistenceService";
import { ScoutAgent, type ScoutPayload, type ScoutResult } from "../scout/ScoutAgent";

/**
 * AgentWorker — processa jobs da fila AgentJob.
 *
 * Design simples para MVP: polling no banco.
 * Futuramente pode ser substituido por BullMQ ou similar.
 */
export class AgentWorker {
  private readonly persistenceService: ProspectPersistenceService;
  private readonly overpassUrl: string;

  constructor(overpassUrl = "https://overpass-api.de/api/interpreter") {
    this.overpassUrl = overpassUrl;
    this.persistenceService = new ProspectPersistenceService();
  }

  async processNext(): Promise<boolean> {
    const job = await prisma.agentJob.findFirst({
      where: {
        status: "PENDING",
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
      },
      orderBy: { createdAt: "asc" },
    });

    if (!job) return false;

    await prisma.agentJob.update({
      where: { id: job.id },
      data: { status: "RUNNING", startedAt: new Date(), attempts: { increment: 1 } },
    });

    try {
      const payload = job.payload as Record<string, unknown>;

      if (job.agentName !== "scout") {
        throw new Error(`Agente desconhecido: ${job.agentName}`);
      }

      const agent = new ScoutAgent(this.overpassUrl);
      const organizationId = (payload.organizationId as string | undefined) ?? "";
      const result = await agent.execute(payload as unknown as ScoutPayload, {
        organizationId,
        jobId: job.id,
        payload,
      });

      if (!result.success) {
        throw new Error(result.error ?? "Erro desconhecido no agente");
      }

      if (result.data) {
        const scoutData: ScoutResult = result.data;
        const persistResult = await this.persistenceService.persistMany(
          organizationId,
          scoutData.prospects
        );
        console.log(
          `[AgentWorker] Persistidos: ${persistResult.created} criados, ${persistResult.skipped} ignorados`
        );
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
}
