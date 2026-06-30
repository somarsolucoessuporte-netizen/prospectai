# Deploy

## Vercel (apps/web)

1. Importe o repositorio no [Vercel](https://vercel.com/new).
2. Defina o **Root Directory** como `apps/web`.
3. O Vercel detecta o Turborepo automaticamente e usa o cache remoto.
4. Configure as variaveis de ambiente (mesmas do `.env.example`) em
   `Project Settings > Environment Variables`.
5. Cada push em `main` gera um deploy de producao; cada PR gera um preview
   deploy automatico (`.github/workflows/preview.yml`).

## Banco de dados (Supabase)

- O banco de producao e o mesmo projeto Supabase usado em desenvolvimento
  ate que o produto seja validado (free tier).
- Migrations sao aplicadas manualmente via `npm run db:migrate deploy` antes
  do deploy, ou automatizadas em um step do CI futuramente.

## Variaveis de ambiente obrigatorias em producao

Veja `.env.example` na raiz do projeto para a lista completa e comentada.
