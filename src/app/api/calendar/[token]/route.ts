import { prisma } from "@/lib/db";
import { getBaseUrl } from "@/lib/mail";
import { buildCalendarFeed } from "@/server/services/calendar";

// Feed ICS de sincronización de calendario. Público solo para quien conoce
// el token personal (guardado en User.calendarToken): Google Calendar y
// otros clientes lo consultan sin cookies. El token se regenera desde la
// app para revocar el acceso.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const user = await prisma.user.findUnique({
    where: { calendarToken: token },
    select: { id: true, name: true },
  });
  if (!user) {
    return new Response("No encontrado", { status: 404 });
  }

  const baseUrl = await getBaseUrl();
  const ics = await buildCalendarFeed(user.id, baseUrl, user.name);

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      // Siempre fresco: los cambios de tareas se reflejan en la siguiente
      // pasada de Google sin esperar a cachés intermedias.
      "Cache-Control": "no-store",
    },
  });
}
