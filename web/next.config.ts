import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // dev:local builds into its own folder, so it can run next to `next dev` and never mixes in
  // bundles built against the real Supabase project
  distDir: process.env.NEXT_DIST_DIR || ".next",
  cacheComponents: true,
  partialPrefetching: true,
  // Profile photos and project images are uploaded through server actions
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  images: {
    remotePatterns: [new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/**`)],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
