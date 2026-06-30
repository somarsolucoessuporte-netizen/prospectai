# ADR-001: Monorepo com Turborepo

**Data:** 2026-06-30
**Status:** Aceito

## Contexto

O ProspectAI e composto por multiplos apps (web dashboard) e pacotes
(agentes, database, config). Precisamos de uma estrutura que permita
compartilhamento de codigo, tipos e configuracoes.

## Decisao

Adotamos **Turborepo** como gerenciador de monorepo.

## Justificativa

| Criterio             | Turborepo       | Nx      | Lerna   |
| -------------------- | --------------- | ------- | ------- |
| Curva de aprendizado | Baixa           | Alta    | Media   |
| Cache de builds      | Nativo + Vercel | Nativo  | Manual  |
| Integracao Vercel    | Nativa          | Parcial | Nenhuma |
| Configuracao         | Minima          | Verbosa | Media   |
| TypeScript           | First-class     | Sim     | Sim     |

O Turborepo tem integracao nativa com o Vercel (nosso host), cache de
builds gratuito, e configuracao minima — alinhado com nosso principio KISS.

## Consequencias

- Todos os apps e pacotes ficam em um unico repositorio
- Tipos TypeScript sao compartilhados via `packages/`
- Pipeline de CI/CD unificado
- Cache de builds automatico no Vercel
