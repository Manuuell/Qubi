import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Salida autocontenida para la imagen Docker de producción.
  output: "standalone",
  async headers() {
    return [
      {
        source: "/join/:token",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
  // No se añade Referrer-Policy: no-referrer: enviaría Origin: null en los
  // POST y Next.js rechazaría todas las Server Actions de esta pantalla.
};

export default nextConfig;
