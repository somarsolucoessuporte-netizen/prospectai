# Visao Geral da Arquitetura

ProspectAI e um monorepo Turborepo composto por um app web (Next.js 14) e um
conjunto de pacotes compartilhados.

## Apps

- **`apps/web`** — Dashboard principal. Next.js 14 (App Router) com tRPC para
  comunicacao type-safe entre frontend e backend, e Supabase Auth para
  autenticacao.

## Pacotes

- **`packages/database`** — Schema Prisma central e cliente singleton
  compartilhado por todos os consumidores do banco.
- **`packages/agents`** — Agentes de IA independentes (Scout, Collector,
  Analyst, Scoring). Nao possuem dependencia do Next.js.
- **`packages/config`** — Validacao de variaveis de ambiente com Zod.
- **`packages/typescript-config`** — Configuracoes base de `tsconfig.json`
  compartilhadas entre apps e pacotes.

## Fluxo de dados (alto nivel)

```
Usuario -> apps/web (Next.js) -> tRPC routers -> Prisma -> Supabase (Postgres)
                                       |
                                       v
                              AgentJob (fila no banco)
                                       |
                                       v
                         packages/agents (Scout -> Collector -> Analyst -> Scoring)
```

Os agentes nao se chamam diretamente: cada execucao cria um `AgentJob` no
banco, que um worker (a ser implementado nas proximas fases) consome e
processa.

## Principios

- Clean Architecture, SOLID, DRY, KISS
- Baixo acoplamento entre agentes — comunicacao apenas via banco de dados
- TypeScript estrito em toda a codebase

Veja tambem [agents.md](./agents.md) e [database.md](./database.md).
