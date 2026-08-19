-- Evento que Qubi creó en el Google Calendar de una persona, por pareja
-- (tarea, responsable): guardar el id permite actualizar en vez de duplicar.
CREATE TABLE "GoogleCalendarEvent" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- Un solo evento por tarea y persona.
CREATE UNIQUE INDEX "GoogleCalendarEvent_issueId_userId_key" ON "GoogleCalendarEvent"("issueId", "userId");
CREATE INDEX "GoogleCalendarEvent_userId_idx" ON "GoogleCalendarEvent"("userId");

ALTER TABLE "GoogleCalendarEvent" ADD CONSTRAINT "GoogleCalendarEvent_issueId_fkey"
    FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoogleCalendarEvent" ADD CONSTRAINT "GoogleCalendarEvent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
