import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getBaseUrl } from "@/lib/mail";
import {
  buildConnectUrl,
  googleCalendarConfigured,
  STATE_COOKIE,
} from "@/server/services/google-calendar";

// Arranca la autorización: manda a la persona a Google a dar permiso sobre su
// calendario. El "state" es un valor aleatorio que viaja a Google y también se
// guarda en una cookie; al volver se comparan. Así, si alguien nos manda un
// callback fabricado, no coincide y se rechaza.
export async function GET() {
  await getCurrentUser(); // solo con sesión; redirige a /login si no hay

  if (!googleCalendarConfigured()) {
    redirect("/account?calendar=no_configurado");
  }

  const state = randomBytes(32).toString("base64url");
  const store = await cookies();
  store.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax", // debe sobrevivir a la vuelta desde Google
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });

  redirect(buildConnectUrl(await getBaseUrl(), state));
}
