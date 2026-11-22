import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    // reference images and imported clips are uploaded through server actions
    serverActions: { bodySizeLimit: "200mb" },
  },
};

export default nextConfig;
