-- Jornada por persona (null = la capacidad por defecto del equipo).
ALTER TABLE "WorkspaceMember" ADD COLUMN     "weeklyCapacityMinutes" INTEGER;

-- Esfuerzo estimado de la tarea: alimenta la carga prevista del equipo.
ALTER TABLE "Issue" ADD COLUMN     "estimateMinutes" INTEGER;
