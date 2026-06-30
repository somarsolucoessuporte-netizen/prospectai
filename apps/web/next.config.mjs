/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@prospectai/database", "@prospectai/config", "@prospectai/agents"],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
