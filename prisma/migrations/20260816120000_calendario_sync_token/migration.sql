-- Token aleatorio por usuario que protege el feed ICS de sincronización
-- de calendario (consultable sin cookies y regenerable).
ALTER TABLE "User" ADD COLUMN     "calendarToken" TEXT;

-- Un solo token por usuario.
CREATE UNIQUE INDEX "User_calendarToken_key" ON "User"("calendarToken");
