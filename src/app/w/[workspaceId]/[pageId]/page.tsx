import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPage, isPageFavorite } from "@/server/services/page";
import {
  getDatabaseProperties,
  getDatabaseRows,
} from "@/server/services/database";
import { getWorkspaceMembers } from "@/server/services/member";
import { PageTitle } from "@/features/page/components/page-title";
import { FavoriteButton } from "@/features/page/components/favorite-button";
import { SharePanel } from "@/features/page/components/share-panel";
import { Editor } from "@/features/editor/components/editor";
import { type Property } from "@/features/database/components/database-table";
import { DatabaseView } from "@/features/database/components/database-view";

export default async function PageView({
  params,
}: {
  params: Promise<{ workspaceId: string; pageId: string }>;
}) {
  const { workspaceId, pageId } = await params;
  const user = await getCurrentUser();

  const page = await getPage(pageId, user.id);
  if (!page) notFound();

  const [members, favorite] = await Promise.all([
    getWorkspaceMembers(workspaceId),
    isPageFavorite(user.id, page.id),
  ]);
  const shareMembers = members.map((m) => ({
    name: m.user.name ?? m.user.email,
    email: m.user.email,
    role: m.role,
  }));

  const header = (
    <div className="mb-4 flex justify-end gap-2">
      <FavoriteButton
        pageId={page.id}
        workspaceId={workspaceId}
        initial={favorite}
      />
      <SharePanel
        pageId={page.id}
        workspaceId={workspaceId}
        isPublic={page.isPublic}
        members={shareMembers}
      />
    </div>
  );

  // Las bases de datos muestran una tabla en lugar del editor de bloques.
  if (page.type === "DATABASE") {
    const [properties, rows] = await Promise.all([
      getDatabaseProperties(page.id),
      getDatabaseRows(page.id),
    ]);

    return (
      <div className="mx-auto max-w-5xl px-12 py-16">
        {header}
        <PageTitle
          pageId={page.id}
          workspaceId={workspaceId}
          initialTitle={page.title}
        />
        <DatabaseView
          databaseId={page.id}
          workspaceId={workspaceId}
          properties={properties as Property[]}
          rows={rows}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-12 py-16">
      {header}
      <PageTitle
        pageId={page.id}
        workspaceId={workspaceId}
        initialTitle={page.title}
      />
      <div className="mt-6">
        <Editor
          pageId={page.id}
          userId={user.id}
          userName={user.name ?? "Usuario"}
          members={members.map((m) => ({
            id: m.userId,
            name: m.user.name ?? m.user.email,
          }))}
        />
      </div>
    </div>
  );
}
