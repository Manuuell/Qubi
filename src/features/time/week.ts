// Utilidades de semana y conversión horas<->minutos para el registro de horas.
// Trabajamos con claves de día "YYYY-MM-DD" y solo convertimos a Date (medianoche
// UTC) en la frontera con la BD, donde TimeEntry.date es @db.Date.

export const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function keyOf(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function keyToLocalDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Lunes (clave) de la semana que contiene la fecha dada.
export function mondayKeyOf(d: Date = new Date()): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // 0 = lunes
  x.setDate(x.getDate() - dow);
  return keyOf(x);
}

export function addDaysToKey(key: string, n: number): string {
  const x = keyToLocalDate(key);
  x.setDate(x.getDate() + n);
  return keyOf(x);
}

export function todayKey(): string {
  return keyOf(new Date());
}

// Date (timestamp) -> clave "YYYY-MM-DD" en horario local.
export function dateToLocalKey(d: Date): string {
  return keyOf(d);
}

export function isValidKey(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function dayNumber(key: string): number {
  return Number(key.split("-")[2]);
}

// Clave -> Date a medianoche UTC (para columnas @db.Date).
export function keyToDbDate(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

// Date de la BD (@db.Date, leída como UTC) -> clave "YYYY-MM-DD".
export function dbDateToKey(d: Date): string {
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${m}-${day}`;
}

// minutos -> horas en texto: 90 -> "1.5", 120 -> "2", 0 -> "".
export function minutesToHours(min: number): string {
  if (!min) return "";
  const h = min / 60;
  return Number.isInteger(h) ? String(h) : String(Math.round(h * 100) / 100);
}

// Igual que minutesToHours pero muestra "0" en vez de vacío (para totales).
export function hoursLabel(min: number): string {
  return min ? minutesToHours(min) : "0";
}

export function hoursToMinutes(h: number): number {
  return Math.round(h * 60);
}

// ── Mes (clave "YYYY-MM") ───────────────────────────────────────────────────

export function monthKeyOf(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
}

export function isValidMonthKey(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}$/.test(s);
}

export function addMonthsToMonthKey(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  return monthKeyOf(new Date(y, m - 1 + n, 1));
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, 1));
}

// Rango del mes como claves de día: [primer día, primer día del mes siguiente).
export function monthRangeKeys(key: string): {
  startKey: string;
  endKey: string;
} {
  const [y, m] = key.split("-").map(Number);
  return {
    startKey: `${key}-01`,
    endKey: `${monthKeyOf(new Date(y, m, 1))}-01`,
  };
}
