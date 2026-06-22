"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { PropertyType } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth";
import * as db from "@/server/services/database";

export async function createDatabaseAction(input: {
  workspaceId: string;
  parentId?: string | null;
}) {
  const user = await getCurrentUser();
  const database = await db.createDatabase({
    workspaceId: input.workspaceId,
    userId: user.id,
    parentId: input.parentId ?? null,
  });
  revalidatePath(`/w/${input.workspaceId}`);
  redirect(`/w/${input.workspaceId}/${database.id}`);
}

export async function addRowAction(input: {
  databaseId: string;
  workspaceId: string;
}) {
  const user = await getCurrentUser();
  await db.createRow(input.databaseId, user.id);
  revalidatePath(`/w/${input.workspaceId}/${input.databaseId}`);
}

export async function addPropertyAction(input: {
  databaseId: string;
  workspaceId: string;
  name?: string;
  type?: PropertyType;
}) {
  const user = await getCurrentUser();
  await db.addProperty(
    input.databaseId,
    user.id,
    input.name ?? "Nueva columna",
    input.type ?? PropertyType.TEXT,
  );
  revalidatePath(`/w/${input.workspaceId}/${input.databaseId}`);
}

export async function deletePropertyAction(input: {
  propertyId: string;
  databaseId: string;
  workspaceId: string;
}) {
  const user = await getCurrentUser();
  await db.deleteProperty(input.propertyId, user.id);
  revalidatePath(`/w/${input.workspaceId}/${input.databaseId}`);
}

export async function addSelectOptionAction(input: {
  propertyId: string;
  databaseId: string;
  workspaceId: string;
  option: string;
}) {
  const user = await getCurrentUser();
  await db.addSelectOption(input.propertyId, user.id, input.option);
  revalidatePath(`/w/${input.workspaceId}/${input.databaseId}`);
}

export async function deleteRowAction(input: {
  pageId: string;
  databaseId: string;
  workspaceId: string;
}) {
  const user = await getCurrentUser();
  await db.deleteRow(input.pageId, user.id);
  revalidatePath(`/w/${input.workspaceId}/${input.databaseId}`);
}

// Las siguientes no revalidan: el cliente ya muestra el valor escrito y así no
// se pierde el foco del input mientras se edita.

export async function renamePropertyAction(input: {
  propertyId: string;
  name: string;
}) {
  const user = await getCurrentUser();
  await db.renameProperty(input.propertyId, user.id, input.name);
}

export async function setCellAction(input: {
  pageId: string;
  propertyId: string;
  value: unknown;
}) {
  const user = await getCurrentUser();
  await db.setCell(
    input.pageId,
    input.propertyId,
    user.id,
    input.value as Prisma.InputJsonValue,
  );
}

export async function setRowTitleAction(input: {
  pageId: string;
  title: string;
}) {
  const user = await getCurrentUser();
  await db.setRowTitle(input.pageId, user.id, input.title);
}

// ── Vista de tablero (kanban) ────────────────────────────────────────────

// Mueve una tarjeta a otra columna (cambia el valor de la propiedad de grupo).
export async function moveCardAction(input: {
  pageId: string;
  propertyId: string;
  value: string;
  databaseId: string;
  workspaceId: string;
}) {
  const user = await getCurrentUser();
  await db.setCell(input.pageId, input.propertyId, user.id, input.value);
  revalidatePath(`/w/${input.workspaceId}/${input.databaseId}`);
}

// Crea una tarjeta directamente en una columna del tablero.
export async function addCardAction(input: {
  databaseId: string;
  workspaceId: string;
  propertyId: string;
  value: string;
}) {
  const user = await getCurrentUser();
  const row = await db.createRow(input.databaseId, user.id);
  if (input.value) {
    await db.setCell(row.id, input.propertyId, user.id, input.value);
  }
  revalidatePath(`/w/${input.workspaceId}/${input.databaseId}`);
}
