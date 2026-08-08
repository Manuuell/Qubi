// Punto de entrada único para todo lo relacionado con horas/cronómetro.
// La lógica vive repartida por responsabilidad en módulos hermanos —
// time-timesheet (hoja propia), time-team (vista de equipo), time-summary
// (resumen mensual), time-timer (máquina de estados del cronómetro) y
// time-progress (historial de avances) — para que ningún archivo mezcle
// varias responsabilidades a la vez. Este barrel existe para no tener que
// tocar cada sitio que hace `import ... from "@/server/services/time"`.
export { getWorkspaceRole } from "@/server/lib/permissions";

export * from "@/server/services/time-timesheet";
export * from "@/server/services/time-team";
export * from "@/server/services/time-summary";
export * from "@/server/services/time-timer";
export * from "@/server/services/time-progress";
