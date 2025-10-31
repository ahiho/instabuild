/*
  Warnings:

  - You are about to drop the column `content` on the `chat_messages` table. All the data in the column will be lost.
  - You are about to drop the column `senderType` on the `chat_messages` table. All the data in the column will be lost.
  - You are about to drop the column `toolCalls` on the `chat_messages` table. All the data in the column will be lost.
  - You are about to drop the column `toolResults` on the `chat_messages` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "chat_messages" DROP COLUMN "content",
DROP COLUMN "senderType",
DROP COLUMN "toolCalls",
DROP COLUMN "toolResults";
