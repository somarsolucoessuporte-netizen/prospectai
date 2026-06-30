# Contribuindo com o ProspectAI

## Pre-requisitos

- Node.js 20+
- npm 10+
- Conta no Supabase (gratuita)
- Conta no Vercel (gratuita)

## Setup Local

```bash
git clone https://github.com/SEU_USUARIO/prospectai.git
cd prospectai
npm install
cp .env.example apps/web/.env.local
# Configure apps/web/.env.local
npm run db:generate
npm run db:push
npm run dev
```

## Padroes de Commit

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: adiciona ScoutAgent com suporte ao Google Places
fix: corrige paginacao na listagem de prospects
chore: atualiza dependencias do Prisma
docs: adiciona ADR sobre escolha do tRPC
refactor: extrai logica de validacao para package/config
```

## Criando uma Nova Feature

1. Crie uma branch: `git checkout -b feat/nome-da-feature`
2. Implemente seguindo os principios do `CLAUDE.md`
3. Rode `npm run lint` e `npm run typecheck`
4. Crie um PR descrevendo o que foi feito e por que
5. Aguarde revisao

## Principios Inegociaveis

- TypeScript estrito — sem `any`
- Sem gambiarras — sempre a solucao correta
- Cada modulo tem uma responsabilidade
- Leia os arquivos antes de modificar
- Documente decisoes importantes
