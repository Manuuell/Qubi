import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ensureDefaultWorkspace } from "@/server/services/workspace";

// Depende del estado de la BD en cada request (qué workspace existe), así que
// no debe prerenderizarse de forma estática.
export const dynamic = "force-dynamic";

// Entrada de la app: lleva al usuario a su espacio de trabajo por defecto.
export default async function Home() {
  const user = await getCurrentUser();
  const workspace = await ensureDefaultWorkspace(user.id);
  redirect(`/w/${workspace.id}`);
}
