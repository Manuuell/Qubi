import { CreatePageButton } from "@/features/page/components/create-page-button";

export default async function WorkspaceHome({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-lg font-medium">Tu espacio está listo</h2>
      <p className="text-muted-foreground max-w-sm text-sm">
        Crea tu primera página o elige una en la barra lateral para empezar.
      </p>
      <CreatePageButton
        workspaceId={workspaceId}
        label="Crear primera página"
      />
    </div>
  );
}
