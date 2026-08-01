// Capacidad de trabajo para la vista de carga del equipo.
//
// Hoy es un valor fijo para todo el mundo (jornada de 8 h, 5 días). Cuando
// haga falta afinarlo por persona basta con pasar otra capacidad a estas
// funciones: ninguna la da por sentada.

export const DAILY_CAPACITY_MINUTES = 8 * 60;
export const WORKDAYS_PER_WEEK = 5;
export const WEEKLY_CAPACITY_MINUTES =
  DAILY_CAPACITY_MINUTES * WORKDAYS_PER_WEEK;

// Capacidad semanal de una persona: la suya si la tiene fijada, si no la del
// equipo. Se ignoran valores absurdos (0 o negativos) para no dividir por cero
// ni pintar a todo el mundo en rojo por un dato mal metido.
export function memberWeeklyCapacity(weeklyCapacityMinutes: number | null) {
  return weeklyCapacityMinutes && weeklyCapacityMinutes > 0
    ? weeklyCapacityMinutes
    : WEEKLY_CAPACITY_MINUTES;
}

// Jornada diaria que se deduce de una capacidad semanal.
export function dailyCapacityOf(weeklyMinutes: number) {
  return Math.round(weeklyMinutes / WORKDAYS_PER_WEEK);
}

// Opciones de jornada que ofrece el selector del manager.
export const CAPACITY_OPTIONS = [
  { minutes: 10 * 60, label: "10 h/semana (2 h/día)" },
  { minutes: 20 * 60, label: "20 h/semana (media jornada)" },
  { minutes: 30 * 60, label: "30 h/semana (6 h/día)" },
  { minutes: 40 * 60, label: "40 h/semana (jornada completa)" },
  { minutes: 45 * 60, label: "45 h/semana (9 h/día)" },
] as const;

export type LoadLevel = "empty" | "light" | "good" | "full" | "over";

// Cómo de cargado está un día (o una semana) respecto a su capacidad.
export function loadLevel(
  minutes: number,
  capacity = DAILY_CAPACITY_MINUTES,
): LoadLevel {
  if (capacity <= 0) return "empty";
  if (minutes <= 0) return "empty";
  const ratio = minutes / capacity;
  if (ratio > 1) return "over";
  if (ratio >= 0.9) return "full";
  if (ratio >= 0.5) return "good";
  return "light";
}

// Minutos por encima de la capacidad (0 si no se pasa).
export function overCapacityMinutes(
  minutes: number,
  capacity = DAILY_CAPACITY_MINUTES,
) {
  return Math.max(0, minutes - capacity);
}

// Porcentaje de la barra/columna que ocupa un tramo, acotado al 100 % para
// que un día sobrecargado no se salga de la celda.
export function capacityPercent(
  minutes: number,
  capacity = DAILY_CAPACITY_MINUTES,
) {
  if (capacity <= 0) return 0;
  return Math.min(100, Math.round((Math.max(0, minutes) / capacity) * 100));
}

export const LOAD_LABEL: Record<LoadLevel, string> = {
  empty: "Sin carga",
  light: "Poca carga",
  good: "Bien",
  full: "Al límite",
  over: "Sobrecargado",
};
