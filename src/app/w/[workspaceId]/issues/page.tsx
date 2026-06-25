import { redirect } from "next/navigation";

// Las "issues" pasaron a ser "tareas" dentro de proyectos. Redirige a Mi agenda.
export default async function IssuesRedirect({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  redirect(`/w/${workspaceId}/agenda`);
}
