-- CreateEnum
CREATE TYPE "ProgressTimerPolicy" AS ENUM ('PAUSE', 'HALF');

-- Los cronómetros en marcha son efímeros: los que quedaron sin tarea no se
-- pueden migrar (ahora la tarea es obligatoria), así que se descartan. Su
-- WorkSession sí se conserva como historial.
DELETE FROM "RunningTimer" WHERE "issueId" IS NULL;

-- DropForeignKey
ALTER TABLE "RunningTimer" DROP CONSTRAINT "RunningTimer_issueId_fkey";

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "progressTimerPolicy" "ProgressTimerPolicy" NOT NULL DEFAULT 'PAUSE';

-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "progressTimerPolicy" "ProgressTimerPolicy";

-- AlterTable
ALTER TABLE "IssueAttachment" ADD COLUMN     "commentId" TEXT;

-- AlterTable
ALTER TABLE "RunningTimer" ADD COLUMN     "progressStartedAt" TIMESTAMP(3),
ALTER COLUMN "issueId" SET NOT NULL;

-- AlterTable
ALTER TABLE "WorkSession" ADD COLUMN     "discarded" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "WorkSessionNote" ADD COLUMN     "issueCommentId" TEXT;

-- CreateIndex
CREATE INDEX "IssueAttachment_commentId_idx" ON "IssueAttachment"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkSessionNote_issueCommentId_key" ON "WorkSessionNote"("issueCommentId");

-- AddForeignKey
ALTER TABLE "IssueAttachment" ADD CONSTRAINT "IssueAttachment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "IssueComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunningTimer" ADD CONSTRAINT "RunningTimer_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkSessionNote" ADD CONSTRAINT "WorkSessionNote_issueCommentId_fkey" FOREIGN KEY ("issueCommentId") REFERENCES "IssueComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
