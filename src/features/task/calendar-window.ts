import { addDaysToKey, dateToLocalKey } from "@/features/time/week";

// Qué días ocupa una tarea en un calendario. Lo comparten las dos
// integraciones —el feed ICS y la sincronización con Google— para que no
// acaben discrepando sobre cuándo cae una misma tarea.
//
// Son eventos de día completo, así que el fin es EXCLUSIVO: una tarea de un
// solo día va de "el día" a "el día siguiente", igual que en iCalendar y en
// la API de Google.

export type TaskDates = {
  startDate: Date | null;
  dueDate: Date | null;
};

export type CalendarWindow = {
  startKey: string; // "YYYY-MM-DD" incluido
  endKey: string; // "YYYY-MM-DD" excluido
};

// null si la tarea no tiene ninguna fecha: no hay dónde ponerla.
export function taskCalendarWindow(task: TaskDates): CalendarWindow | null {
  const start = task.startDate ?? task.dueDate;
  const due = task.dueDate ?? task.startDate;
  if (!start || !due) return null;

  const startKey = dateToLocalKey(new Date(start));
  let endKey = addDaysToKey(dateToLocalKey(new Date(due)), 1);

  // Datos raros (inicio después del fin): al menos un día de evento.
  if (endKey <= startKey) endKey = addDaysToKey(startKey, 1);

  return { startKey, endKey };
}
