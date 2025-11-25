/*
  Warnings:

  - A unique constraint covering the columns `[userId,type]` on the table `deployment_accounts` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."deployment_accounts_userId_type_email_key";

-- CreateIndex
CREATE UNIQUE INDEX "deployment_accounts_userId_type_key" ON "deployment_accounts"("userId", "type");
