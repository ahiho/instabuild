-- CreateEnum
CREATE TYPE "DeploymentAccountType" AS ENUM ('GITHUB', 'CLOUDFLARE');

-- CreateEnum
CREATE TYPE "DeploymentType" AS ENUM ('GITHUB_PAGES', 'CLOUDFLARE_PAGES');

-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('PENDING', 'BUILDING', 'UPLOADING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "deployment_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DeploymentAccountType" NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "organization" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsed" TIMESTAMP(3),

    CONSTRAINT "deployment_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployment_configs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "DeploymentType" NOT NULL,
    "githubRepo" TEXT,
    "githubBranch" TEXT DEFAULT 'gh-pages',
    "cloudflareProjectName" TEXT,
    "cloudflareBranch" TEXT DEFAULT 'main',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deployment_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployment_history" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "status" "DeploymentStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "buildDuration" INTEGER,
    "uploadDuration" INTEGER,
    "buildLogs" TEXT NOT NULL,
    "errorMessage" TEXT,
    "deployedUrl" TEXT,
    "triggeredBy" TEXT,

    CONSTRAINT "deployment_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deployment_accounts_userId_idx" ON "deployment_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "deployment_accounts_userId_type_email_key" ON "deployment_accounts"("userId", "type", "email");

-- CreateIndex
CREATE INDEX "deployment_configs_projectId_idx" ON "deployment_configs"("projectId");

-- CreateIndex
CREATE INDEX "deployment_configs_accountId_idx" ON "deployment_configs"("accountId");

-- CreateIndex
CREATE INDEX "deployment_history_configId_idx" ON "deployment_history"("configId");

-- CreateIndex
CREATE INDEX "deployment_history_status_idx" ON "deployment_history"("status");

-- CreateIndex
CREATE INDEX "deployment_history_startedAt_idx" ON "deployment_history"("startedAt");

-- AddForeignKey
ALTER TABLE "deployment_accounts" ADD CONSTRAINT "deployment_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployment_configs" ADD CONSTRAINT "deployment_configs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployment_configs" ADD CONSTRAINT "deployment_configs_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "deployment_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployment_history" ADD CONSTRAINT "deployment_history_configId_fkey" FOREIGN KEY ("configId") REFERENCES "deployment_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
