-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "toolResults" JSONB;

-- CreateTable
CREATE TABLE "tool_executions" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "chatMessageId" TEXT,
    "toolCallId" TEXT NOT NULL,
    "toolName" VARCHAR(100) NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "error" TEXT,
    "status" VARCHAR(20) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "userId" VARCHAR(100) NOT NULL,

    CONSTRAINT "tool_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tool_executions_toolCallId_key" ON "tool_executions"("toolCallId");

-- AddForeignKey
ALTER TABLE "tool_executions" ADD CONSTRAINT "tool_executions_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_executions" ADD CONSTRAINT "tool_executions_chatMessageId_fkey" FOREIGN KEY ("chatMessageId") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
