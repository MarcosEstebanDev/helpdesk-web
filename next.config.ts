import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build autocontenido para la imagen Docker (copia solo lo necesario).
  output: "standalone",
};

export default nextConfig;
