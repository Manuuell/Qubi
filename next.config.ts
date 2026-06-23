import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Salida autocontenida para la imagen Docker de producción.
  output: "standalone",
};

export default nextConfig;
