import { notFound } from "next/navigation";
import { getPublicPage } from "@/server/services/page";
import {
  getDatabaseProperties,
  getDatabaseRows,
} from "@/server/services/database";
import { ReadonlyEditor } from "@/features/editor/components/readonly-editor";
import { ListView } from "@/features/database/components/list-view";
import { type Property } from "@/features/database/components/database-table";

export const dynamic = "force-dynamic";

export default async function PublicPage({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = await params;
  const page = await getPublicPage(pageId);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="text-muted-foreground mb-3 text-xs">
        Vista pública · solo lectura · hecho con Qubi
      </div>
      <h1 className="font-display text-4xl font-bold tracking-tight">
        {page.title || "Sin título"}
      </h1>

      {page.type === "DATABASE" ? (
        <PublicDatabase pageId={page.id} />
      ) : (
        <div className="mt-6">
          <ReadonlyEditor pageId={page.id} />
        </div>
      )}
    </div>
  );
}

async function PublicDatabase({ pageId }: { pageId: string }) {
  const [properties, rows] = await Promise.all([
    getDatabaseProperties(pageId),
    getDatabaseRows(pageId),
  ]);
  return <ListView properties={properties as Property[]} rows={rows} />;
}
