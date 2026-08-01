-- Al pasar la tarea a obligatoria, los cronómetros que estaban en marcha sin
-- tarea se descartaron (migración anterior). Sus sesiones de trabajo quedaron
-- abiertas: se cierran aquí para que no figuren "en marcha" para siempre.
-- Nunca llegaron a imputar horas, así que se marcan como descartadas.
UPDATE "WorkSession" s
SET "endedAt" = NOW(), "discarded" = true
WHERE s."endedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "RunningTimer" t WHERE t."sessionId" = s.id
  );
