# Modelo de Dados

Schema central em `packages/database/prisma/schema.prisma`, gerenciado via
Prisma Migrate sobre um banco PostgreSQL hospedado no Supabase.

## Modelos principais

- **`Organization`** — Tenant raiz. Todo dado de negocio pertence a uma
  organizacao (multi-tenant).
- **`Member`** — Vincula um usuario do Supabase Auth (`userId`) a uma
  organizacao, com um `role` (`OWNER`, `ADMIN`, `MEMBER`).
- **`Prospect`** — Empresa/negocio identificado. Contem dados de
  identificacao, localizacao, contato, presenca digital e score comercial.
- **`Tag`** / **`ProspectTag`** — Categorizacao livre de prospects.
- **`Campaign`** — Agrupamento de execucoes de agentes com uma configuracao
  especifica.
- **`Interaction`** — Registro de CRM basico (notas, e-mails, ligacoes,
  reunioes, propostas, follow-ups) associado a um prospect.
- **`AgentJob`** — Fila de execucao dos agentes. Cada linha representa uma
  unidade de trabalho (`agentName`, `payload`, `status`, `result`).

## Convencoes

- IDs sao `cuid()` (nao auto-increment), para evitar enumeracao e facilitar
  merges entre ambientes.
- Todas as tabelas usam `snake_case` no banco (via `@map`) e `camelCase` no
  cliente Prisma.
- Datas sempre em UTC.
- Multi-tenancy via `organizationId` em todas as tabelas de dominio — Row
  Level Security (RLS) do Supabase sera habilitado nas proximas fases para
  reforcar o isolamento no nivel do banco.

## Migrations

```bash
npm run db:push      # aplica o schema diretamente (prototipagem)
npm run db:migrate   # cria uma migration versionada
npm run db:studio    # abre o Prisma Studio
```
