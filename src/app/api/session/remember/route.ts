import { redirect } from "next/navigation";
import { ensureCurrentInRing } from "@/server/account-ring";

export const dynamic = "force-dynamic";

// Escala intermedia justo después de iniciar sesión: dejar la cuenta en el
// anillo requiere escribir cookie, y eso solo se puede hacer en una server
// action o en un route handler como este. Aquí es donde tiene sentido: el
// login con Google termina en el callback de Auth.js, así que la acción que
// lo lanzó ya no está viva para registrar nada.
//
// Sin este paso, el conmutador solo se llenaba al usar "Agregar otra cuenta";
// entrar normalmente no dejaba rastro y "Cambiar de cuenta" salía vacío.
export async function GET() {
  await ensureCurrentInRing();
  redirect("/");
}
