import type { NextConfig } from "next";
import path from "node:path";

/** API Fastify vista pelo servidor do Next. Local: API_URL (padrão localhost:4000).
 *  Na Render: API_HOST, o nome da API na rede privada, e API_PORT. */
const apiUrl =
  process.env.API_URL ??
  (process.env.API_HOST ? `http://${process.env.API_HOST}:${process.env.API_PORT ?? "4000"}` : "http://localhost:4000");

const config: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // Fixado no build: o proxy abaixo e a sessão no servidor (lib/sessao-servidor) usam o mesmo endereço.
  env: { API_URL: apiUrl },
  // A sincronização do radar consulta várias APIs públicas e passa dos 30 s padrão do proxy.
  experimental: { proxyTimeout: 180_000 },
  // API Fastify atrás do mesmo domínio (cookie de sessão same-origin).
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default config;
