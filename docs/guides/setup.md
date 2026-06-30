# Setup Local

## Pre-requisitos

- Node.js 20+
- npm 10+
- Conta gratuita no [Supabase](https://supabase.com)

## Passos

1. Clone o repositorio e instale as dependencias:

   ```bash
   git clone https://github.com/SEU_USUARIO/prospectai.git
   cd prospectai
   npm install
   ```

2. Crie um projeto no Supabase e copie as credenciais em
   `Settings > API` e `Settings > Database`.

3. Configure as variaveis de ambiente:

   ```bash
   cp .env.example apps/web/.env.local
   # edite apps/web/.env.local com suas credenciais
   ```

4. Gere o cliente Prisma e aplique o schema:

   ```bash
   npm run db:generate
   npm run db:push
   ```

5. Inicie o ambiente de desenvolvimento:

   ```bash
   npm run dev
   ```

6. Acesse [http://localhost:3000](http://localhost:3000).

## Scripts uteis

| Comando             | Descricao                                    |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Inicia todos os apps em modo desenvolvimento |
| `npm run build`     | Build de producao de todos os apps/pacotes   |
| `npm run lint`      | Lint em todo o monorepo                      |
| `npm run typecheck` | Checagem de tipos em todo o monorepo         |
| `npm run db:studio` | Abre o Prisma Studio                         |
