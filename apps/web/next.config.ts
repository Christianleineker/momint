import type { NextConfig } from "next";
import path from "node:path";

const config: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // A sincronização do radar consulta várias APIs públicas e passa dos 30 s padrão do proxy.
  experimental: { proxyTimeout: 180_000 },
  // API Fastify atrás do mesmo domínio (cookie de sessão same-origin).
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${process.env.API_URL ?? "http://localhost:4000"}/api/:path*` }];
  },
};

export default config;
