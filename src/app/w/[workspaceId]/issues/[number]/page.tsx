import { redirect } from "next/navigation";

// Compatibilidad: la URL antigua de detalle de issue apunta a la nueva de tarea.
export default async function IssueDetailRedirect({
  params,
}: {
  params: Promise<{ workspaceId: string; number: string }>;
}) {
  const { workspaceId, number } = await params;
  redirect(`/w/${workspaceId}/tasks/${number}`);
}
