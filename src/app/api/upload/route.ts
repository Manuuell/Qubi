import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";
import { checkRateLimit } from "@/server/lib/rate-limit";

// Usado por el editor de páginas (BlockNote) para incrustar imágenes,
// documentos y demás archivos dentro del contenido de una página.
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

// Extensiones ejecutables/instalables: nunca deben servirse desde el bucket
// público, sea cual sea el Content-Type que reporte el navegador.
const BLOCKED_EXTENSIONS = new Set([
  "exe",
  "msi",
  "bat",
  "cmd",
  "com",
  "scr",
  "sh",
  "ps1",
  "app",
  "apk",
  "dmg",
  "jar",
]);

export async function POST(request: Request) {
  const user = await getCurrentUser();

  const rateLimit = checkRateLimit(`upload:${user.id}`, {
    max: 20,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Demasiadas subidas seguidas. Espera un momento." },
      { status: 429 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No se recibió un archivo válido" },
      { status: 400 },
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && BLOCKED_EXTENSIONS.has(ext)) {
    return NextResponse.json(
      { error: "Ese tipo de archivo no está permitido" },
      { status: 400 },
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "El archivo no puede superar 8 MB" },
      { status: 400 },
    );
  }

  const url = await uploadFile(file);
  return NextResponse.json({ url });
}
