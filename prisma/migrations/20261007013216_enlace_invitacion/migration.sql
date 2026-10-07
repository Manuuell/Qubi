-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'MEMBER_JOINED';

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "inviteLinkToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_inviteLinkToken_key" ON "Workspace"("inviteLinkToken");

