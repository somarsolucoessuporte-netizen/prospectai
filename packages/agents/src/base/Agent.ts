/**
 * Classe base abstrata para todos os agentes do ProspectAI.
 *
 * Cada agente tem uma responsabilidade unica e bem definida.
 * Agentes NAO devem conhecer a implementacao de outros agentes.
 * Comunicacao entre agentes ocorre via AgentJob (banco de dados).
 */

export interface AgentContext {
  organizationId: string;
  jobId: string;
  payload: Record<string, unknown>;
}

export interface AgentResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

export abstract class Agent<TPayload = Record<string, unknown>, TResult = unknown> {
  abstract readonly name: string;
  abstract readonly description: string;

  abstract execute(payload: TPayload, context: AgentContext): Promise<AgentResult<TResult>>;

  protected log(message: string, data?: unknown): void {
    console.log(`[${this.name}] ${message}`, data ?? "");
  }

  protected logError(message: string, error?: unknown): void {
    console.error(`[${this.name}] ERROR: ${message}`, error ?? "");
  }
}
