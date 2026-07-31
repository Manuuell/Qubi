import { prisma } from "@/lib/db";
import { PropertyType } from "@/generated/prisma/enums";
import { assertWorkspaceMember } from "@/server/lib/permissions";
import { getProject } from "@/server/services/project";

// "Bases de datos" de archivos/información de un proyecto: reutiliza el
// sistema de páginas tipo Notion (Page con type=DATABASE). Una misma base
// puede vincularse a 2 o más proyectos (tabla puente ProjectDatabase), para
// compartir información entre proyectos relacionados.

export type ProjectDatabaseItem = {
  id: string;
  title: string;
  icon: string | null;
  sharedWithProjects: { id: string; name: string }[];
};

async function assertProjectAccess(projectId: string, userId: string) {
  const project = await getProject(projectId, userId);
  if (!project) throw new Error("Proyecto no encontrado");
  return project;
}

export async function listProjectDatabases(
  projectId: string,
  userId: string,
): Promise<ProjectDatabaseItem[]> {
  await assertProjectAccess(projectId, userId);
  const links = await prisma.projectDatabase.findMany({
    where: { projectId },
    include: {
      page: {
        select: {
          id: true,
          title: true,
          icon: true,
          archivedAt: true,
          projectDatabases: {
            select: { project: { select: { id: true, name: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return links
    .filter((l) => l.page.archivedAt === null)
    .map((l) => ({
      id: l.page.id,
      title: l.page.title || "Base de datos",
      icon: l.page.icon,
      sharedWithProjects: l.page.projectDatabases
        .map((pd) => pd.project)
        .filter((p) => p.id !== projectId),
    }));
}

// Bases de datos del workspace que todavía no están vinculadas a este
// proyecto (para el selector "vincular existente").
export async function listLinkableDatabases(
  projectId: string,
  workspaceId: string,
  userId: string,
) {
  await assertWorkspaceMember(workspaceId, userId);
  const linked = await prisma.projectDatabase.findMany({
    where: { projectId },
    select: { pageId: true },
  });
  const linkedIds = new Set(linked.map((l) => l.pageId));
  const databases = await prisma.page.findMany({
    where: { workspaceId, type: "DATABASE", archivedAt: null },
    select: { id: true, title: true, icon: true },
    orderBy: { title: "asc" },
  });
  return databases.filter((d) => !linkedIds.has(d.id));
}

// Crea una base de datos nueva (con columnas básicas) y la vincula al proyecto.
export async function createProjectDatabase(
  projectId: string,
  userId: string,
  name: string,
) {
  const project = await assertProjectAccess(projectId, userId);
  const page = await prisma.page.create({
    data: {
      workspaceId: project.workspaceId,
      type: "DATABASE",
      title: name.trim() || "Base de datos",
      createdById: userId,
    },
  });
  await prisma.databaseProperty.createMany({
    data: [
      {
        databaseId: page.id,
        name: "Estado",
        type: PropertyType.SELECT,
        position: 0,
        config: { options: ["Pendiente", "En curso", "Hecho"] },
      },
      {
        databaseId: page.id,
        name: "Notas",
        type: PropertyType.TEXT,
        position: 1,
      },
    ],
  });
  await prisma.projectDatabase.create({
    data: { projectId, pageId: page.id },
  });
  return page;
}

// Vincula una base de datos ya existente (posiblemente usada por otro
// proyecto) a este proyecto también.
export async function linkExistingDatabase(
  projectId: string,
  workspaceId: string,
  userId: string,
  pageId: string,
) {
  await assertWorkspaceMember(workspaceId, userId);
  await assertProjectAccess(projectId, userId);
  await prisma.projectDatabase.upsert({
    where: { projectId_pageId: { projectId, pageId } },
    create: { projectId, pageId },
    update: {},
  });
}

export async function unlinkDatabase(
  projectId: string,
  userId: string,
  pageId: string,
) {
  await assertProjectAccess(projectId, userId);
  await prisma.projectDatabase.deleteMany({ where: { projectId, pageId } });
}
