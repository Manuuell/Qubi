-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TASK_REVIEW_FEEDBACK';
ALTER TYPE "NotificationType" ADD VALUE 'TASK_REOPENED';

-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('TASK', 'FEATURE', 'BUG', 'IMPROVEMENT', 'DOCS');

-- CreateEnum
CREATE TYPE "IssueCommentKind" AS ENUM ('COMMENT', 'PROGRESS', 'REVIEW_FEEDBACK');

-- AlterTable: nuevas columnas de Issue
ALTER TABLE "Issue" ADD COLUMN     "type" "IssueType" NOT NULL DEFAULT 'TASK',
ADD COLUMN     "linkedPageId" TEXT;

-- AlterTable: IssueComment.kind
ALTER TABLE "IssueComment" ADD COLUMN     "kind" "IssueCommentKind" NOT NULL DEFAULT 'COMMENT';

-- AlterTable: WorkSession.issueId
ALTER TABLE "WorkSession" ADD COLUMN     "issueId" TEXT;

-- AlterTable: RunningTimer.issueId
ALTER TABLE "RunningTimer" ADD COLUMN     "issueId" TEXT;

-- CreateTable
CREATE TABLE "IssueAssignee" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssueAssignee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Label" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Label_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueLabel" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,

    CONSTRAINT "IssueLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueAttachment" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssueAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueStatusEvent" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "fromStatus" "IssueStatus",
    "toStatus" "IssueStatus" NOT NULL,
    "actorId" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssueStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDatabase" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectDatabase_pkey" PRIMARY KEY ("id")
);

-- Backfill: copiar el asignado único existente a la tabla puente antes de borrar la columna
INSERT INTO "IssueAssignee" ("id", "issueId", "userId", "createdAt")
SELECT gen_random_uuid()::text, "id", "assigneeId", "createdAt"
FROM "Issue"
WHERE "assigneeId" IS NOT NULL;

-- AlterTable: quitar el asignado único (reemplazado por IssueAssignee)
ALTER TABLE "Issue" DROP CONSTRAINT IF EXISTS "Issue_assigneeId_fkey";
DROP INDEX IF EXISTS "Issue_assigneeId_idx";
ALTER TABLE "Issue" DROP COLUMN "assigneeId";

-- CreateIndex
CREATE UNIQUE INDEX "IssueAssignee_issueId_userId_key" ON "IssueAssignee"("issueId", "userId");
CREATE INDEX "IssueAssignee_userId_idx" ON "IssueAssignee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Label_workspaceId_name_key" ON "Label"("workspaceId", "name");
CREATE INDEX "Label_workspaceId_idx" ON "Label"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "IssueLabel_issueId_labelId_key" ON "IssueLabel"("issueId", "labelId");
CREATE INDEX "IssueLabel_labelId_idx" ON "IssueLabel"("labelId");

-- CreateIndex
CREATE INDEX "IssueAttachment_issueId_idx" ON "IssueAttachment"("issueId");

-- CreateIndex
CREATE INDEX "IssueStatusEvent_issueId_createdAt_idx" ON "IssueStatusEvent"("issueId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDatabase_projectId_pageId_key" ON "ProjectDatabase"("projectId", "pageId");
CREATE INDEX "ProjectDatabase_pageId_idx" ON "ProjectDatabase"("pageId");

-- CreateIndex
CREATE INDEX "Issue_linkedPageId_idx" ON "Issue"("linkedPageId");

-- CreateIndex
CREATE INDEX "WorkSession_issueId_idx" ON "WorkSession"("issueId");

-- CreateIndex
CREATE INDEX "RunningTimer_issueId_idx" ON "RunningTimer"("issueId");

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_linkedPageId_fkey" FOREIGN KEY ("linkedPageId") REFERENCES "Page"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueAssignee" ADD CONSTRAINT "IssueAssignee_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IssueAssignee" ADD CONSTRAINT "IssueAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Label" ADD CONSTRAINT "Label_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueLabel" ADD CONSTRAINT "IssueLabel_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IssueLabel" ADD CONSTRAINT "IssueLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueAttachment" ADD CONSTRAINT "IssueAttachment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IssueAttachment" ADD CONSTRAINT "IssueAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueStatusEvent" ADD CONSTRAINT "IssueStatusEvent_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IssueStatusEvent" ADD CONSTRAINT "IssueStatusEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDatabase" ADD CONSTRAINT "ProjectDatabase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectDatabase" ADD CONSTRAINT "ProjectDatabase_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkSession" ADD CONSTRAINT "WorkSession_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunningTimer" ADD CONSTRAINT "RunningTimer_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
