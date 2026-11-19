import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // dev:local builds into its own folder, so it can run next to `next dev` and never mixes in
  // bundles built against the real Supabase project
  distDir: process.env.NEXT_DIST_DIR || ".next",
  cacheComponents: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Nobody can frame the site (clickjacking); the CSP line says the same to newer browsers
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
        ],
      },
    ];
  },
  partialPrefetching: true,
  // Profile photos and project images are uploaded through server actions
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  images: {
    // Uploaded images, and Google or GitHub account photos for members who haven't uploaded one (account-photos.sql)
    remotePatterns: [
      new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/**`),
      new URL("https://lh3.googleusercontent.com/**"),
      // Exactly the query photoUrl gives GitHub avatars, so the optimizer takes no other variations
      { protocol: "https", hostname: "avatars.githubusercontent.com", pathname: "/**", search: "?v=4&s=256" },
    ],
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
