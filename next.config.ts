import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ADR-0006: renderização dinâmica por requisição (dados pessoais em todas as páginas).
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["pg", "embedded-postgres", "nodemailer"],
  images: {
    formats: ["image/avif", "image/webp"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ];
    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" });
    }
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
