/*
  Warnings:

  - You are about to drop the column `landingPageId` on the `conversations` table. All the data in the column will be lost.
  - Added the required column `userId` to the `chat_messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectId` to the `conversations` table without a default value. This is not possible if the table is not empty.
  - Made the column `userId` on table `conversations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lastAccessedAt` on table `conversations` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `projectId` to the `landing_pages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `landing_pages` table without a default value. This is not possible if the table is not empty.

*/

-- Development phase: Clear existing data to avoid migration conflicts
TRUNCATE TABLE "chat_messages" CASCADE;
TRUNCATE TABLE "conversations" CASCADE;
TRUNCATE TABLE "landing_pages" CASCADE;
TRUNCATE TABLE "landing_page_versions" CASCADE;
TRUNCATE TABLE "assets" CASCADE;
TRUNCATE TABLE "modification_commands" CASCADE;
TRUNCATE TABLE "tool_executions" CASCADE;
TRUNCATE TABLE "model_usage" CASCADE;

-- DropIndex
DROP INDEX "public"."conversations_sandboxId_idx";

-- DropIndex
DROP INDEX "public"."conversations_sandboxPort_idx";

-- DropIndex
DROP INDEX "public"."conversations_sandboxStatus_idx";

-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "conversations" DROP COLUMN "landingPageId",
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "projectId" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL DEFAULT 'New Conversation',
ALTER COLUMN "userId" SET NOT NULL,
ALTER COLUMN "lastAccessedAt" SET NOT NULL,
ALTER COLUMN "lastAccessedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "landing_pages" ADD COLUMN     "projectId" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "displayName" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'local',
    "providerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL DEFAULT 'user',
    "preferences" JSONB,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "projects_userId_idx" ON "projects"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_key" ON "user_sessions"("token");

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

-- CreateIndex
CREATE INDEX "user_sessions_token_idx" ON "user_sessions"("token");

-- CreateIndex
CREATE INDEX "user_sessions_expiresAt_idx" ON "user_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "chat_messages_conversationId_idx" ON "chat_messages"("conversationId");

-- CreateIndex
CREATE INDEX "chat_messages_userId_idx" ON "chat_messages"("userId");

-- CreateIndex
CREATE INDEX "conversations_projectId_idx" ON "conversations"("projectId");

-- CreateIndex
CREATE INDEX "conversations_userId_idx" ON "conversations"("userId");

-- CreateIndex
CREATE INDEX "landing_pages_projectId_idx" ON "landing_pages"("projectId");

-- CreateIndex
CREATE INDEX "landing_pages_userId_idx" ON "landing_pages"("userId");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
