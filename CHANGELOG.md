# Changelog

Todas as mudancas notaveis neste projeto serao documentadas aqui.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [Unreleased]

### Added

- **CollectorAgent** — consulta de CNPJ via ReceitaWS com fallback Brasil API
- **EnrichmentAgent** — extracao de telefone, WhatsApp, email e redes sociais do website
- **ScoringAgent** — score comercial 0-100 com Groq/Llama 3 (persiste oportunidades e abordagem sugerida)
- **WriterAgent** — geracao de mensagens de abordagem personalizadas (WhatsApp/email)
- AgentWorker: despacho por agente, pipeline scout -> enrichment + scoring, `processBatch`
- Dashboard com metricas (funil por status, distribuicao de score, oportunidades)
- Filtros na tabela de prospects (status, score minimo, WhatsApp)
- CRM: modelo de Interacoes, quadro de pipeline (Kanban) e pagina de detalhe do prospect
- API publica de leitura `GET /api/v1/prospects` autenticada por chave de organizacao
- Configuracoes: geracao/revogacao de chave de API para integracoes
- Navegacao global do painel e link direto do WhatsApp com mensagem pre-preenchida

### Changed

- Schema Prospect: `opportunities`, `suggestedApproach`, `outreachMessage`, `outreachAt`
- Schema Organization: `apiKey`

## [0.1.0] — 2026-06-30

### Added

- Monorepo Turborepo com apps/web e packages/
- Next.js 14 (App Router) configurado
- Prisma com schema inicial (Organization, Prospect, Campaign, AgentJob)
- Supabase Auth com middleware de protecao de rotas
- Estrutura base dos agentes (ScoutAgent, CollectorAgent, AnalystAgent, ScoringAgent)
- TypeScript estrito em toda a codebase
- ESLint + Prettier configurados
- Docker Compose para desenvolvimento local
- Documentacao inicial (README, ROADMAP, CONTRIBUTING, CHANGELOG)
- CLAUDE.md com regras permanentes do projeto
- Architecture Decision Records (ADR-001)
