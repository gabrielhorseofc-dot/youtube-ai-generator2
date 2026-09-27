import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ] },
      ...["/api/projects/:path*", "/api/workspace", "/api/account", "/api/auth/:path*"].map((source) => ({ source, headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }] })),
    ];
  },
};

export default nextConfig;
