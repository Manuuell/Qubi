import { headers } from "next/headers";

// IP del cliente cuando la app corre detrás del nginx del VPS.
//
// Se prefiere X-Real-IP porque el proxy la reescribe siempre con la IP real de
// la conexión ($remote_addr). X-Forwarded-For la puede mandar el cliente y el
// proxy solo le añade la suya al final, así que su primer valor es
// falsificable: sirve como respaldo, no como fuente de verdad.
//
// Sin proxy delante (desarrollo) no hay ninguna cabecera fiable y se devuelve
// null: quien llame decide qué hacer con ese caso.
export async function getClientIp(): Promise<string | null> {
  const h = await headers();

  const realIp = h.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || null;
}
