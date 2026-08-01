-- CreateTable
CREATE TABLE "IssueCommentReaction" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssueCommentReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessageReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessageReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IssueCommentReaction_commentId_userId_emoji_key" ON "IssueCommentReaction"("commentId", "userId", "emoji");
CREATE INDEX "IssueCommentReaction_commentId_idx" ON "IssueCommentReaction"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMessageReaction_messageId_userId_emoji_key" ON "ChatMessageReaction"("messageId", "userId", "emoji");
CREATE INDEX "ChatMessageReaction_messageId_idx" ON "ChatMessageReaction"("messageId");

-- AddForeignKey
ALTER TABLE "IssueCommentReaction" ADD CONSTRAINT "IssueCommentReaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "IssueComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IssueCommentReaction" ADD CONSTRAINT "IssueCommentReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessageReaction" ADD CONSTRAINT "ChatMessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessageReaction" ADD CONSTRAINT "ChatMessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
