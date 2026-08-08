import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";
import { checkRateLimit } from "@/server/lib/rate-limit";

// Sin llamadores en el código propio desde que se quitó el editor de páginas
// (BlockNote); se deja disponible para subidas genéricas vía API. El tamaño
// y las extensiones/tipos bloqueados se validan de forma centralizada en
// uploadFile() (ver @/lib/storage), no aquí.
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

  try {
    const url = await uploadFile(file);
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "No se pudo subir el archivo",
      },
      { status: 400 },
    );
  }
}
