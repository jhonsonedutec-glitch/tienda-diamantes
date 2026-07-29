/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ff/shared'],
  poweredByHeader: false,
  output: 'standalone',
};

export default nextConfig;
