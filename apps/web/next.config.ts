import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  outputFileTracingRoot: path.join(__dirname, "../.."),
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@siedler/shared-types": path.join(__dirname, "../../packages/shared-types/dist/index.js"),
      "@siedler/game-engine": path.join(__dirname, "../../packages/game-engine/dist/index.js"),
      "@siedler/realtime": path.join(__dirname, "../../apps/realtime/dist/index.js"),
    };

    return config;
  },
};

export default nextConfig;
