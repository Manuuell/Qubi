-- Autorización por persona para que Qubi escriba en su Google Calendar.
-- El refresh token se guarda cifrado (AES-256-GCM), nunca en claro.
CREATE TABLE "GoogleCalendarLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "googleEmail" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleCalendarLink_pkey" PRIMARY KEY ("id")
);

-- Una sola conexión por usuario.
CREATE UNIQUE INDEX "GoogleCalendarLink_userId_key" ON "GoogleCalendarLink"("userId");

ALTER TABLE "GoogleCalendarLink" ADD CONSTRAINT "GoogleCalendarLink_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
