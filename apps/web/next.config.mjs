/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@prospectai/database", "@prospectai/config", "@prospectai/agents"],
  experimental: {
    typedRoutes: true,
  },
  eslint: {
    // Lint runs as its own step (npm run lint / CI) — skip Next's built-in
    // pass so a monorepo-scoped install that omits devDependencies doesn't
    // fail the production build just because eslint isn't resolvable.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
