# Arquitetura dos Agentes

Os agentes vivem em `packages/agents` e sao a peca central do produto. Cada
agente tem **uma unica responsabilidade** e nao conhece a implementacao dos
demais.

## Classe base

Todo agente estende `Agent<TPayload, TResult>` (`src/base/Agent.ts`), que
define o contrato:

```typescript
abstract execute(payload: TPayload, context: AgentContext): Promise<AgentResult<TResult>>;
```

## Agentes atuais (stubs na Fase 0)

| Agente           | Responsabilidade                                        | Fase de implementacao |
| ---------------- | ------------------------------------------------------- | --------------------- |
| `ScoutAgent`     | Encontrar empresas (Google Maps, Instagram, LinkedIn)   | Fase 1                |
| `CollectorAgent` | Coletar dados adicionais (website, CNPJ, redes sociais) | Fase 2                |
| `AnalystAgent`   | Analisar presenca digital e identificar oportunidades   | Fase 3                |
| `ScoringAgent`   | Calcular score comercial (0-100)                        | Fase 3                |

## Comunicacao entre agentes

Agentes **nunca** se importam diretamente. A orquestracao ocorre via a
tabela `AgentJob` no banco: um agente produz um resultado, que e persistido
e usado para criar o proximo `AgentJob` na cadeia (Scout -> Collector ->
Analyst -> Scoring -> Writer).

Isso garante:

- Reexecucao independente de cada etapa em caso de falha
- Auditoria completa do pipeline
- Possibilidade de paralelizar agentes do mesmo tipo

## AgentRegistry

`AgentRegistry` (`src/base/AgentRegistry.ts`) permite que um worker resolva
um agente pelo nome (`"scout"`, `"collector"`, ...) sem importar a classe
concreta diretamente — util para o processador de fila que sera implementado
nas proximas fases.
