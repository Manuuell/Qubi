import { ProgressTimerPolicy } from "@/generated/prisma/enums";

// Reglas del cronómetro. Vive fuera de server/services/time.ts para poder
// importarse desde componentes cliente sin arrastrar Prisma/pg al navegador.

// Una sesión por debajo de este umbral no se imputa a las horas del día: se
// guarda como historial (con sus avances) pero marcada como descartada.
export const MIN_BILLABLE_MINUTES = 10;

export function isBillableSession(minutes: number) {
  return minutes >= MIN_BILLABLE_MINUTES;
}

// Minutos que realmente se suman a las horas del día.
export function billableMinutes(minutes: number) {
  return isBillableSession(minutes) ? minutes : 0;
}

// Aviso que se le muestra a la persona cuando su sesión no va a contar.
export function shortSessionNotice(minutes: number) {
  const m = Math.max(0, Math.floor(minutes));
  return `Llevas ${m} ${m === 1 ? "minuto" : "minutos"}. Por debajo de ${MIN_BILLABLE_MINUTES} minutos el tiempo no se guarda como horas trabajadas; el avance que hayas documentado sí se conserva.`;
}

// Cuánto tiempo se acredita por los minutos que la persona pasó documentando
// un avance: nada si el cronómetro se pausa, la mitad si sigue corriendo.
export function creditedProgressMinutes(
  elapsedMinutes: number,
  policy: ProgressTimerPolicy,
) {
  const elapsed = Math.max(0, Math.floor(elapsedMinutes));
  return policy === ProgressTimerPolicy.HALF ? Math.floor(elapsed / 2) : 0;
}

// Factor al que avanza el reloj en pantalla mientras se documenta.
export function progressTickRate(policy: ProgressTimerPolicy) {
  return policy === ProgressTimerPolicy.HALF ? 0.5 : 0;
}

export const PROGRESS_POLICY_LABEL: Record<ProgressTimerPolicy, string> = {
  PAUSE: "Se pausa mientras documenta",
  HALF: "Sigue corriendo a la mitad",
};

export const PROGRESS_POLICY_HINT: Record<ProgressTimerPolicy, string> = {
  PAUSE:
    "El cronómetro se detiene mientras la persona escribe su avance y se reanuda al guardarlo.",
  HALF: "El cronómetro sigue corriendo mientras documenta, pero solo se acredita la mitad del tiempo.",
};

// La tarea manda sobre el proyecto; si no define nada, hereda.
export function effectiveProgressPolicy(
  projectPolicy: ProgressTimerPolicy,
  taskPolicy: ProgressTimerPolicy | null,
): ProgressTimerPolicy {
  return taskPolicy ?? projectPolicy;
}
