import { redirect } from "next/navigation";
import { joinPath } from "@/lib/join-token";
import { ensureCurrentInRing } from "@/server/account-ring";
import { takePendingJoin } from "@/server/pending-join";

export const dynamic = "force-dynamic";

// Escala intermedia justo después de iniciar sesión: dejar la cuenta en el
// anillo requiere escribir cookie, y eso solo se puede hacer en una server
// action o en un route handler como este. Aquí es donde tiene sentido: tanto
// el login con Google como el de contraseña terminan aquí, y el de Google lo
// hace desde el callback de Auth.js, cuando la acción que lo lanzó ya no está
// viva. Por eso también es aquí donde se retoma una unión a un espacio que
// quedó pendiente al abrir un enlace de invitación sin sesión.
//
// Sin este paso, el conmutador solo se llenaba al usar "Agregar otra cuenta";
// entrar normalmente no dejaba rastro y "Cambiar de cuenta" salía vacío.
export async function GET() {
  await ensureCurrentInRing();
  const join = await takePendingJoin();
  redirect(join ? joinPath(join) : "/");
}
