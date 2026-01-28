import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Set maximum body size for API routes to 50MB
  // This provides first-line defense against oversized uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
