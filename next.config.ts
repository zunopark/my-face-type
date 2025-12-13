import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    minimumCacheTTL: 0,
  },
  headers: async () => [
    {
      source: "/img/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "no-store, no-cache, must-revalidate, max-age=0",
        },
      ],
    },
  ],
};

export default nextConfig;
