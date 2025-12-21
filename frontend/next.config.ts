import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Improve Fast Refresh stability
  reactStrictMode: true,
  // Disable webpack cache issues that can cause refresh loops
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Prevent infinite refresh loops in development
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: /node_modules/,
      };
    }
    return config;
  },
};

export default nextConfig;
