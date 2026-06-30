import type { Agent } from "./Agent";

/**
 * Registro central de agentes disponiveis no sistema.
 *
 * Permite que o orquestrador (fora deste pacote) resolva um agente
 * pelo nome sem precisar importar a classe concreta diretamente.
 */
export class AgentRegistry {
  private readonly agents = new Map<string, Agent>();

  register(agent: Agent): void {
    if (this.agents.has(agent.name)) {
      throw new Error(`Agent "${agent.name}" is already registered`);
    }
    this.agents.set(agent.name, agent);
  }

  get(name: string): Agent | undefined {
    return this.agents.get(name);
  }

  list(): string[] {
    return Array.from(this.agents.keys());
  }
}
