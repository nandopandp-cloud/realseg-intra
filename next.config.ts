import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ADR-0006: renderização dinâmica por requisição (dados pessoais em todas as páginas).
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["pg", "embedded-postgres", "nodemailer"],
  images: {
    // Imagens já otimizadas (WebP) e servidas pela CDN como arquivos estáticos — sem transformações
    // da Vercel Image Optimization (limite de 5 mil/mês no Hobby). docs/COST_OPTIMIZATION.md §2.
    unoptimized: true,
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
    // Arquivos públicos versionados por nome: cache longo no navegador e na CDN (menos Edge Requests).
    // Ao alterar uma imagem/logo, publique com NOVO nome de arquivo. docs/COST_OPTIMIZATION.md §3.
    const longCache = [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }];
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/images/:file*", headers: longCache },
      { source: "/logo/:file*", headers: longCache },
    ];
  },
};

export default nextConfig;
