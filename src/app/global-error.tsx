"use client";

import { useEffect } from "react";

// Solo se activa si el layout raíz mismo falla al renderizar (caso extremo).
// Debe traer su propio <html>/<body>, ya que reemplaza el layout raíz.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            fontFamily: "system-ui, sans-serif",
            background: "#0b0b0f",
            color: "#f4f4f5",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 380 }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
              Algo salió mal
            </h1>
            <p style={{ opacity: 0.7, marginTop: "0.5rem" }}>
              Ocurrió un error inesperado al cargar Qubi.
            </p>
            <button
              onClick={() => reset()}
              style={{
                marginTop: "1.5rem",
                padding: "0.6rem 1.25rem",
                borderRadius: "999px",
                background: "#f4f4f5",
                color: "#0b0b0f",
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
