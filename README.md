# ProspectAI

> Inteligencia comercial para encontrar oportunidades reais.

ProspectAI e uma plataforma SaaS de Inteligencia Comercial baseada em IA que transforma dados publicos em oportunidades de negocio qualificadas.

## O que o ProspectAI faz

- Encontra empresas a partir de multiplas fontes (Google Maps, redes sociais, APIs)
- Analisa presenca digital e detecta oportunidades
- Gera Score Comercial (0-100) com justificativa
- Cria abordagens personalizadas com IA
- Alimenta CRM automaticamente
- Executa agentes inteligentes de forma autonoma

## Stack

- **Monorepo:** Turborepo
- **Frontend:** Next.js 14 (App Router)
- **API:** tRPC
- **Banco:** Prisma + Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Deploy:** Vercel

## Inicio Rapido

```bash
# Clone o repositorio
git clone https://github.com/SEU_USUARIO/prospectai.git
cd prospectai

# Instale as dependencias
npm install

# Configure as variaveis de ambiente
cp .env.example apps/web/.env.local
# Edite apps/web/.env.local com suas credenciais do Supabase

# Gere o cliente Prisma
npm run db:generate

# Execute as migrations
npm run db:push

# Inicie o desenvolvimento
npm run dev
```

Acesse: http://localhost:3000

## Documentacao

- [Arquitetura](./docs/architecture/overview.md)
- [Agentes](./docs/architecture/agents.md)
- [Banco de Dados](./docs/architecture/database.md)
- [Setup Local](./docs/guides/setup.md)
- [Deploy](./docs/guides/deployment.md)
- [Roadmap](./ROADMAP.md)
- [Contribuicao](./CONTRIBUTING.md)

## Licenca

MIT — veja [LICENSE](./LICENSE)

---

<p align="center">Desenvolvido por <a href="https://somar.ia.br">Somar Solucoes Digitais</a></p>
