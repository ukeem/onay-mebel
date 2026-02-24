import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // Upload images are served via nginx→backend; the Next.js container
    // cannot reach /uploads/ internally, so skip optimization for them.
    unoptimized: true,
  },
  turbopack: {
    root: rootDir,
  },

  // Proxy /api and /uploads to backend in local dev only (production uses nginx)
  ...(process.env.NODE_ENV !== "production" && {
    async rewrites() {
      const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
      return [
        { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
        {
          source: "/uploads/:path*",
          destination: `${backendUrl}/uploads/:path*`,
        },
      ];
    },
  }),

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' ws: wss:; frame-src 'self' blob:;",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
