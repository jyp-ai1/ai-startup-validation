import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@repo/ui", "@repo/core", "@repo/db", "@repo/feature-auth", "@repo/ai", "@repo/mcp"],
  serverExternalPackages: [
    "playwright",
    "playwright-core",
    "sharp",
    "@repo/browser",
    "@repo/automation",
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "playwright",
        "playwright-core",
        "@repo/browser",
      ];
    }
    return config;
  },
};

export default nextConfig;
