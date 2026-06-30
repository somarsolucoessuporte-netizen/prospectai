# ProspectAI — Roadmap

## Visao

Tornar-se a principal plataforma de Inteligencia Comercial do Brasil,
permitindo que qualquer empresa identifique e aborde oportunidades reais de
negocio de forma automatizada, consultiva e baseada em dados.

---

## Fase 0 — Fundacao [Concluida]

- [x] Monorepo Turborepo
- [x] Next.js 14 configurado
- [x] Prisma + Supabase
- [x] Supabase Auth
- [x] TypeScript estrito
- [x] ESLint + Prettier
- [x] Docker Compose
- [x] Documentacao inicial
- [x] Schema de banco inicial
- [x] Estrutura base dos agentes

---

## Fase 1 — Scout Agent (Google Maps)

**Objetivo:** Buscar e armazenar prospects a partir do Google Places API

- [ ] Integracao Google Places API
- [ ] ScoutAgent implementado
- [ ] Interface de busca no dashboard
- [ ] Listagem de prospects encontrados
- [ ] Paginacao e filtros basicos

---

## Fase 2 — Collector + Enrichment

**Objetivo:** Enriquecer dados dos prospects

- [ ] CollectorAgent — scraping de websites
- [ ] EnrichmentAgent — validacao de CNPJ (ReceitaWS)
- [ ] Deteccao de redes sociais
- [ ] Painel de enriquecimento
- [ ] Historico de coleta

---

## Fase 3 — Analyst + Scoring

**Objetivo:** Analisar oportunidades com IA e gerar score

- [ ] AnalystAgent — analise de presenca digital
- [ ] ScoringAgent — score 0-100 com justificativa
- [ ] Integracao Claude/GPT para analise
- [ ] Visualizacao de scores no dashboard
- [ ] Filtros por score e oportunidade

---

## Fase 4 — Writer Agent

**Objetivo:** Criar abordagens comerciais personalizadas

- [ ] WriterAgent — geracao de mensagens
- [ ] Templates por tipo de oportunidade
- [ ] Personalizacao por setor/porte
- [ ] Editor de mensagens no dashboard
- [ ] Historico de mensagens enviadas

---

## Fase 5 — Dashboard Completo

**Objetivo:** Interface completa de inteligencia comercial

- [ ] Dashboard com metricas e KPIs
- [ ] Mapa de prospects
- [ ] Pipeline visual (kanban)
- [ ] Relatorios exportaveis
- [ ] Filtros avancados

---

## Fase 6 — CRM Integration

**Objetivo:** Acompanhamento completo do ciclo de vendas

- [ ] CRMAgent — gestao de contatos
- [ ] Pipeline de vendas
- [ ] Registro de interacoes
- [ ] Lembretes e follow-ups
- [ ] Integracao com WhatsApp

---

## Fase 7 — Automacao e Integracoes

**Objetivo:** Conectar ProspectAI ao ecossistema do cliente

- [ ] Webhooks de eventos
- [ ] Integracao n8n
- [ ] API publica documentada
- [ ] SDK para integracoes
- [ ] Marketplace de conectores

---

## Futuro (6-24 meses)

- Fontes adicionais: Instagram, LinkedIn, Facebook
- LearningAgent — aprendizado com feedback
- App mobile (React Native)
- White-label para agencias
- Marketplace de agentes customizados
