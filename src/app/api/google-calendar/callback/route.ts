import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getBaseUrl } from "@/lib/mail";
import {
  completeConnection,
  STATE_COOKIE,
} from "@/server/services/google-calendar";

// Vuelta desde Google. Antes de canjear nada se comprueba que el "state"
// coincide con el de la cookie: sin eso, un tercero podría hacer que conectes
// SU cuenta de Google a TU Qubi enviándote un enlace preparado.
export async function GET(request: Request) {
  const user = await getCurrentUser();

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const denied = url.searchParams.get("error");

  const store = await cookies();
  const expected = store.get(STATE_COOKIE)?.value;
  store.delete(STATE_COOKIE); // de un solo uso, pase lo que pase

  if (denied) {
    // La persona pulsó "Cancelar" en la pantalla de Google: no es un fallo.
    redirect("/account?calendar=cancelado");
  }
  if (!code || !state || !expected || state !== expected) {
    redirect("/account?calendar=error");
  }

  const result = await completeConnection(user.id, code, await getBaseUrl());
  redirect(result.ok ? "/account?calendar=ok" : "/account?calendar=error");
}
