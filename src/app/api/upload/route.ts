import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";

export async function POST(request: Request) {
  // Control de acceso básico (auth real en la fase final).
  await getCurrentUser();

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No se recibió un archivo válido" },
      { status: 400 },
    );
  }

  const url = await uploadFile(file);
  return NextResponse.json({ url });
}
