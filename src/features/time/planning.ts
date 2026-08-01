import { addDaysToKey, dateToLocalKey } from "@/features/time/week";

// Reparto de la carga PREVISTA de una tarea entre los días en los que se va a
// trabajar. Es lo que llena los días futuros de la vista de equipo: las horas
// registradas solo existen para el pasado.
//
// El criterio es deliberadamente simple y explicable: la estimación se reparte
// a partes iguales entre los días laborables del tramo de la tarea (de su
// fecha de inicio a su fecha límite), sin contar fines de semana ni días ya
// pasados. Si no hay estimación no se inventa ninguna: la tarea se cuenta
// aparte, como trabajo sin estimar.

export type PlannedTask = {
  id: string;
  startDate: Date | null;
  dueDate: Date | null;
  estimateMinutes: number | null;
};

export function isWeekendKey(dateKey: string) {
  const day = new Date(`${dateKey}T00:00:00`).getDay();
  return day === 0 || day === 6;
}

// Días laborables del tramo de la tarea, desde hoy (lo pasado ya no se
// planifica) hasta su fecha límite. Sin fechas no hay tramo que repartir.
export function plannedDayKeys(task: PlannedTask, todayKey: string): string[] {
  if (!task.dueDate) return [];
  const dueKey = dateToLocalKey(new Date(task.dueDate));
  const rawStartKey = task.startDate
    ? dateToLocalKey(new Date(task.startDate))
    : todayKey;
  // Una tarea que debió empezar ayer se planifica desde hoy, no hacia atrás.
  const startKey = rawStartKey < todayKey ? todayKey : rawStartKey;
  if (dueKey < startKey) return [];

  const keys: string[] = [];
  for (let key = startKey; key <= dueKey; key = addDaysToKey(key, 1)) {
    if (!isWeekendKey(key)) keys.push(key);
    if (keys.length > 60) break; // tope de seguridad para tramos absurdos
  }
  return keys;
}

// Minutos previstos de la tarea en cada uno de sus días de trabajo.
export function plannedMinutesPerDay(task: PlannedTask, todayKey: string) {
  const days = plannedDayKeys(task, todayKey);
  if (days.length === 0 || !task.estimateMinutes || task.estimateMinutes <= 0) {
    return { days, minutesPerDay: 0 };
  }
  return {
    days,
    minutesPerDay: Math.round(task.estimateMinutes / days.length),
  };
}
