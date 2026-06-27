-- CreateTable
CREATE TABLE "RunningTimer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunningTimer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RunningTimer_userId_key" ON "RunningTimer"("userId");

-- CreateIndex
CREATE INDEX "RunningTimer_projectId_idx" ON "RunningTimer"("projectId");

-- AddForeignKey
ALTER TABLE "RunningTimer" ADD CONSTRAINT "RunningTimer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunningTimer" ADD CONSTRAINT "RunningTimer_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
