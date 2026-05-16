/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  serverExternalPackages: ['@prisma/client', 'prisma'],
}

module.exports = nextConfig
