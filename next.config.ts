import type { NextConfig } from "next";

/**
 * Proxy `/api/*` → API (ADR-0035). Solo si hay destino.
 *
 * `API_PROXY_TARGET` se lee en BUILD: con `output: standalone` las rewrites
 * quedan congeladas en el manifiesto de rutas, así que tiene que ser un ARG del
 * Dockerfile, igual que las `NEXT_PUBLIC_*`.
 *
 * En Railway apunta a la red PRIVADA (`http://helpdesk-api.railway.internal:8080`)
 * y no a la URL pública, por el rate limiting: por la pública la petición
 * pasaría por un segundo proxy de Railway que agregaría la IP de ESTE servidor
 * al final de `X-Forwarded-For`, y la API (`TRUST_PROXY_HOPS=1`) vería a todos
 * los usuarios con la misma IP — el límite de login se volvería global. Por la
 * privada, el último salto sigue siendo el borde de Railway delante de la web,
 * que agregó la IP real del cliente.
 */
const apiProxyTarget = process.env.API_PROXY_TARGET?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // Build autocontenido para la imagen Docker (copia solo lo necesario).
  output: "standalone",
  async rewrites() {
    if (!apiProxyTarget) return [];
    return [{ source: "/api/:path*", destination: `${apiProxyTarget}/:path*` }];
  },
};

export default nextConfig;
