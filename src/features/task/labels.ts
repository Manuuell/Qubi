import { IssueStatus, Priority } from "@/generated/prisma/enums";

// Etiquetas y orden de los estados (columnas del tablero).
export const STATUS_LABEL: Record<IssueStatus, string> = {
  TODO: "Por hacer",
  IN_PROGRESS: "En curso",
  DONE: "Hecha",
};
export const STATUS_ORDER: IssueStatus[] = [
  IssueStatus.TODO,
  IssueStatus.IN_PROGRESS,
  IssueStatus.DONE,
];

// Color del punto/indicador de cada columna.
export const STATUS_DOT: Record<IssueStatus, string> = {
  TODO: "bg-muted-foreground/50",
  IN_PROGRESS: "bg-blue-500",
  DONE: "bg-green-500",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
};
export const PRIORITY_ORDER: Priority[] = [
  Priority.LOW,
  Priority.MEDIUM,
  Priority.HIGH,
];

// Clases para la píldora de prioridad (claro/oscuro).
export const PRIORITY_CLASS: Record<Priority, string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  HIGH: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export function initials(name: string | null, email: string) {
  const base = (name?.trim() || email).trim();
  return base.slice(0, 2).toUpperCase();
}

export function formatDueDate(d: Date | string | null) {
  if (!d) return null;
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  }).format(new Date(d));
}

// Date -> "YYYY-MM-DD" en horario local (para <input type="date">).
export function toDateInputValue(d: Date | string | null) {
  if (!d) return "";
  const dt = new Date(d);
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${m}-${day}`;
}
