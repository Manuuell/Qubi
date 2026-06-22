import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { PropertyType } from "@/generated/prisma/enums";

// Acceso a una base de datos (Page type=DATABASE) verificando membresía.
async function assertDatabaseAccess(databaseId: string, userId: string) {
  const db = await prisma.page.findFirst({
    where: {
      id: databaseId,
      type: "DATABASE",
      workspace: { members: { some: { userId } } },
    },
  });
  if (!db) throw new Error("Base de datos no encontrada");
  return db;
}

export function getDatabase(databaseId: string, userId: string) {
  return prisma.page.findFirst({
    where: {
      id: databaseId,
      type: "DATABASE",
      workspace: { members: { some: { userId } } },
    },
  });
}

export function getDatabaseProperties(databaseId: string) {
  return prisma.databaseProperty.findMany({
    where: { databaseId },
    orderBy: { position: "asc" },
  });
}

export async function getDatabaseRows(databaseId: string) {
  const rows = await prisma.page.findMany({
    where: { databaseId, archivedAt: null },
    orderBy: { createdAt: "asc" },
    include: { propertyValues: true },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    values: Object.fromEntries(
      r.propertyValues.map((v) => [v.propertyId, v.value]),
    ) as Record<string, unknown>,
  }));
}

// Crea una base de datos con un par de columnas y una fila de ejemplo.
export async function createDatabase(opts: {
  workspaceId: string;
  userId: string;
  parentId?: string | null;
  name?: string;
}) {
  const db = await prisma.page.create({
    data: {
      workspaceId: opts.workspaceId,
      parentId: opts.parentId ?? null,
      type: "DATABASE",
      title: opts.name ?? "Base de datos",
      createdById: opts.userId,
    },
  });

  await prisma.databaseProperty.createMany({
    data: [
      {
        databaseId: db.id,
        name: "Estado",
        type: PropertyType.SELECT,
        position: 0,
        config: { options: ["Pendiente", "En curso", "Hecho"] },
      },
      {
        databaseId: db.id,
        name: "Fecha",
        type: PropertyType.DATE,
        position: 1,
      },
      {
        databaseId: db.id,
        name: "Notas",
        type: PropertyType.TEXT,
        position: 2,
      },
    ],
  });

  await prisma.page.create({
    data: { workspaceId: opts.workspaceId, databaseId: db.id, title: "" },
  });

  return db;
}

export async function createRow(databaseId: string, userId: string) {
  const db = await assertDatabaseAccess(databaseId, userId);
  return prisma.page.create({
    data: { workspaceId: db.workspaceId, databaseId, title: "" },
  });
}

export async function addProperty(
  databaseId: string,
  userId: string,
  name: string,
  type: PropertyType = PropertyType.TEXT,
) {
  await assertDatabaseAccess(databaseId, userId);
  const count = await prisma.databaseProperty.count({ where: { databaseId } });
  return prisma.databaseProperty.create({
    data: { databaseId, name: name || "Columna", type, position: count },
  });
}

export async function renameProperty(
  propertyId: string,
  userId: string,
  name: string,
) {
  const property = await prisma.databaseProperty.findUnique({
    where: { id: propertyId },
  });
  if (!property) throw new Error("Columna no encontrada");
  await assertDatabaseAccess(property.databaseId, userId);
  return prisma.databaseProperty.update({
    where: { id: propertyId },
    data: { name },
  });
}

export async function setCell(
  pageId: string,
  propertyId: string,
  userId: string,
  value: Prisma.InputJsonValue,
) {
  const property = await prisma.databaseProperty.findUnique({
    where: { id: propertyId },
  });
  if (!property) throw new Error("Columna no encontrada");
  await assertDatabaseAccess(property.databaseId, userId);
  return prisma.propertyValue.upsert({
    where: { pageId_propertyId: { pageId, propertyId } },
    update: { value },
    create: { pageId, propertyId, value },
  });
}

export async function setRowTitle(
  pageId: string,
  userId: string,
  title: string,
) {
  const row = await prisma.page.findFirst({
    where: { id: pageId, workspace: { members: { some: { userId } } } },
  });
  if (!row) throw new Error("Fila no encontrada");
  return prisma.page.update({ where: { id: pageId }, data: { title } });
}

export async function deleteRow(pageId: string, userId: string) {
  const row = await prisma.page.findFirst({
    where: { id: pageId, workspace: { members: { some: { userId } } } },
  });
  if (!row) throw new Error("Fila no encontrada");
  return prisma.page.delete({ where: { id: pageId } });
}

export async function deleteProperty(propertyId: string, userId: string) {
  const property = await prisma.databaseProperty.findUnique({
    where: { id: propertyId },
  });
  if (!property) throw new Error("Columna no encontrada");
  await assertDatabaseAccess(property.databaseId, userId);
  return prisma.databaseProperty.delete({ where: { id: propertyId } });
}

// Añade una opción a una columna de tipo SELECT.
export async function addSelectOption(
  propertyId: string,
  userId: string,
  option: string,
) {
  const property = await prisma.databaseProperty.findUnique({
    where: { id: propertyId },
  });
  if (!property) throw new Error("Columna no encontrada");
  await assertDatabaseAccess(property.databaseId, userId);

  const value = option.trim();
  if (!value) return property;

  const config = (property.config as { options?: string[] } | null) ?? {};
  const options = config.options ?? [];
  if (options.includes(value)) return property;

  return prisma.databaseProperty.update({
    where: { id: propertyId },
    data: {
      config: {
        ...config,
        options: [...options, value],
      } as Prisma.InputJsonValue,
    },
  });
}
