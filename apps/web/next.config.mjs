/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@prospectai/database", "@prospectai/config", "@prospectai/agents"],
  experimental: {
    typedRoutes: true,
    // Next 15 renomeou isso para a chave de topo "serverExternalPackages".
    // Nesta versao (14.2.x) ainda e experimental — mantem o Prisma Client
    // fora do bundle do webpack para nao quebrar a resolucao do binario
    // da query engine em runtime serverless.
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
  eslint: {
    // Lint runs as its own step (npm run lint / CI) — skip Next's built-in
    // pass so a monorepo-scoped install that omits devDependencies doesn't
    // fail the production build just because eslint isn't resolvable.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
