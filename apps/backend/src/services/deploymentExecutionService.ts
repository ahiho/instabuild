import {
  PrismaClient,
  DeploymentHistory,
  DeploymentStatus,
  DeploymentType,
} from '@prisma/client';
import { BuildService } from './buildService.js';
import { GitHubPagesService } from './githubPagesService.js';
import { CloudflarePagesService } from './cloudflarePagesService.js';
import { DeploymentAccountService } from './deploymentAccountService.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface DeploymentProgress {
  id: string;
  status: DeploymentStatus;
  phase: 'pending' | 'building' | 'uploading' | 'complete' | 'failed';
  progress: number; // 0-100
  message: string;
  logs: string;
  deployedUrl?: string;
  error?: string;
}

/**
 * Service for executing deployments
 * Orchestrates the build and upload pipeline
 */
export class DeploymentExecutionService {
  private prisma: PrismaClient;
  private buildService: BuildService;
  private githubService: GitHubPagesService;
  private cloudflareService: CloudflarePagesService;
  private accountService: DeploymentAccountService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.buildService = new BuildService();
    this.githubService = new GitHubPagesService();
    this.cloudflareService = new CloudflarePagesService();
    this.accountService = new DeploymentAccountService(prisma);
  }

  /**
   * Trigger a new deployment
   * Returns immediately with deployment ID, processes in background
   */
  async triggerDeployment(
    projectId: string,
    configId: string,
    userId: string
  ): Promise<DeploymentHistory> {
    console.log('[DeploymentExecution] Triggering deployment', {
      projectId,
      configId,
      userId,
    });

    // Verify project belongs to user
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!project) {
      console.error('[DeploymentExecution] Project not found', {
        projectId,
        userId,
      });
      throw new Error('Project not found or does not belong to user');
    }

    console.log('[DeploymentExecution] Project found', {
      projectId: project.id,
      sandboxId: project.sandboxId,
    });

    // Verify config belongs to project
    const config = await this.prisma.deploymentConfig.findFirst({
      where: {
        id: configId,
        projectId,
      },
      include: {
        account: true,
      },
    });

    if (!config) {
      console.error('[DeploymentExecution] Config not found', {
        configId,
        projectId,
      });
      throw new Error('Deployment configuration not found');
    }

    console.log('[DeploymentExecution] Config found', {
      configId: config.id,
      type: config.type,
      accountId: config.accountId,
    });

    // Verify sandbox exists
    if (!project.sandboxId) {
      console.error('[DeploymentExecution] No active sandbox', {
        projectId,
      });
      throw new Error('Project does not have an active sandbox');
    }

    // Create deployment history record
    const deployment = await this.prisma.deploymentHistory.create({
      data: {
        configId,
        status: DeploymentStatus.PENDING,
        buildLogs: 'Deployment queued...\n',
        triggeredBy: userId,
      },
    });

    console.log('[DeploymentExecution] Deployment record created', {
      deploymentId: deployment.id,
      status: deployment.status,
    });

    // Execute deployment in background (fire and forget)
    this.executeDeployment(
      deployment.id,
      project.sandboxId,
      config,
      userId
    ).catch(error => {
      console.error(
        `[DeploymentExecution] Background deployment ${deployment.id} failed:`,
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        }
      );
    });

    return deployment;
  }

  /**
   * Execute the deployment pipeline
   * Runs in background
   */
  private async executeDeployment(
    deploymentId: string,
    containerId: string,
    config: any,
    userId: string
  ): Promise<void> {
    const startTime = Date.now();
    let tempDir: string | undefined;
    let buildOutputDir: string | undefined;

    console.log(`[Deployment ${deploymentId}] Starting deployment execution`, {
      containerId,
      configType: config.type,
      userId,
    });

    try {
      // Phase 1: Extract files from sandbox
      console.log(
        `[Deployment ${deploymentId}] Phase 1: Extracting files from sandbox`
      );

      await this.updateDeployment(deploymentId, {
        status: DeploymentStatus.BUILDING,
        buildLogs: 'Extracting files from sandbox...\n',
      });

      tempDir = await this.buildService.extractFilesFromSandbox(containerId);

      console.log(
        `[Deployment ${deploymentId}] Files extracted to: ${tempDir}`
      );
      await this.appendLog(
        deploymentId,
        `Files extracted to temporary directory: ${tempDir}\n`
      );

      // Phase 2: Run build
      console.log(
        `[Deployment ${deploymentId}] Phase 2: Running build process`
      );
      await this.appendLog(deploymentId, '\n=== Starting build process ===\n');

      // For GitHub Pages, extract repo name for base path
      let basePath: string | undefined;
      if (config.type === DeploymentType.GITHUB_PAGES && config.githubRepo) {
        // Extract repo name from "owner/repo" format
        const repoName = config.githubRepo.split('/')[1];
        if (repoName) {
          basePath = `/${repoName}/`;
          console.log(
            `[Deployment ${deploymentId}] Setting base path for GitHub Pages: ${basePath}`
          );
          await this.appendLog(
            deploymentId,
            `Building with base path: ${basePath}\n`
          );
        }
      }

      const buildStartTime = Date.now();
      const buildResult = await this.buildService.runBuild(tempDir, basePath);
      const buildDuration = Date.now() - buildStartTime;

      console.log(`[Deployment ${deploymentId}] Build completed`, {
        success: buildResult.success,
        duration: buildDuration,
        error: buildResult.error,
        outputDir: buildResult.outputDir,
      });

      await this.appendLog(deploymentId, buildResult.buildLogs);

      if (!buildResult.success) {
        // Build failed
        console.error(
          `[Deployment ${deploymentId}] Build failed:`,
          buildResult.error
        );
        await this.updateDeployment(deploymentId, {
          status: DeploymentStatus.FAILED,
          errorMessage: buildResult.error || 'Build failed',
          completedAt: new Date(),
          buildDuration: buildResult.duration,
        });
        return;
      }

      buildOutputDir = buildResult.outputDir;
      console.log(
        `[Deployment ${deploymentId}] Build output directory: ${buildOutputDir}`
      );

      // Phase 3: Upload to platform
      console.log(
        `[Deployment ${deploymentId}] Phase 3: Uploading to platform`
      );
      const uploadStartTime = Date.now();

      await this.updateDeployment(deploymentId, {
        status: DeploymentStatus.UPLOADING,
        buildDuration: buildResult.duration,
      });

      await this.appendLog(
        deploymentId,
        '\n=== Uploading to deployment platform ===\n'
      );

      let deployedUrl: string;

      // Get decrypted access token
      console.log(
        `[Deployment ${deploymentId}] Getting decrypted access token for account: ${config.account.id}`
      );
      const accessToken = await this.accountService.getDecryptedToken(
        config.account.id,
        userId
      );
      console.log(
        `[Deployment ${deploymentId}] Access token retrieved (length: ${accessToken?.length || 0})`
      );

      if (config.type === DeploymentType.GITHUB_PAGES) {
        console.log(`[Deployment ${deploymentId}] Deploying to GitHub Pages`, {
          repo: config.githubRepo,
          branch: config.githubBranch || 'gh-pages',
        });

        await this.appendLog(
          deploymentId,
          `Deploying to GitHub Pages: ${config.githubRepo}\n`
        );

        deployedUrl = await this.githubService.deployToGitHub(
          accessToken,
          config.githubRepo,
          config.githubBranch || 'gh-pages',
          buildOutputDir
        );

        console.log(
          `[Deployment ${deploymentId}] GitHub Pages deployment successful`,
          {
            url: deployedUrl,
          }
        );
        await this.appendLog(
          deploymentId,
          'GitHub Pages deployment successful!\n'
        );
      } else {
        // Cloudflare Pages
        console.log(
          `[Deployment ${deploymentId}] Deploying to Cloudflare Pages`,
          {
            project: config.cloudflareProjectName,
            branch: config.cloudflareBranch || 'main',
          }
        );

        await this.appendLog(
          deploymentId,
          `Deploying to Cloudflare Pages: ${config.cloudflareProjectName}\n`
        );

        // Create wrangler.jsonc for Cloudflare Pages
        await this.createWranglerConfig(
          buildOutputDir,
          config.cloudflareProjectName
        );

        deployedUrl = await this.cloudflareService.deployToCloudflare(
          accessToken,
          config.cloudflareProjectName,
          config.cloudflareBranch || 'main',
          buildOutputDir
        );

        console.log(
          `[Deployment ${deploymentId}] Cloudflare Pages deployment successful`,
          {
            url: deployedUrl,
          }
        );
        await this.appendLog(
          deploymentId,
          'Cloudflare Pages deployment successful!\n'
        );
      }

      const uploadDuration = Date.now() - uploadStartTime;
      console.log(
        `[Deployment ${deploymentId}] Upload completed in ${uploadDuration}ms`
      );

      // Update last used timestamp
      await this.accountService.updateLastUsed(config.account.id);

      // Phase 4: Finalize
      const totalDuration = Date.now() - startTime;
      console.log(
        `[Deployment ${deploymentId}] Phase 4: Finalizing deployment`,
        {
          totalDuration,
          deployedUrl,
        }
      );

      await this.updateDeployment(deploymentId, {
        status: DeploymentStatus.SUCCESS,
        deployedUrl,
        completedAt: new Date(),
        uploadDuration,
      });

      await this.appendLog(
        deploymentId,
        `\n=== Deployment completed successfully ===\nURL: ${deployedUrl}\nTotal time: ${totalDuration}ms\n`
      );

      console.log(
        `[Deployment ${deploymentId}] Deployment completed successfully`,
        {
          url: deployedUrl,
          totalDuration,
          buildDuration: buildResult.duration,
          uploadDuration,
        }
      );
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      console.error(
        `[Deployment ${deploymentId}] Deployment failed after ${totalDuration}ms:`,
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        }
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      await this.updateDeployment(deploymentId, {
        status: DeploymentStatus.FAILED,
        errorMessage,
        completedAt: new Date(),
      });

      await this.appendLog(
        deploymentId,
        `\n=== Deployment failed ===\nError: ${errorMessage}\n`
      );
    } finally {
      // Clean up temporary directory (unless debugging)
      const debugMode = process.env.DEBUG_MODE === 'true';

      if (tempDir) {
        if (debugMode) {
          console.log(
            `[Deployment ${deploymentId}] KEEPING temporary directory for debugging: ${tempDir}`
          );
          await this.appendLog(
            deploymentId,
            `\n[DEBUG] Temp files kept at: ${tempDir}\n`
          );
        } else {
          console.log(
            `[Deployment ${deploymentId}] Cleaning up temporary directory: ${tempDir}`
          );
          await this.buildService.cleanup(tempDir);
        }
      }
    }
  }

  /**
   * Get deployment status
   */
  async getStatus(deploymentId: string): Promise<DeploymentProgress> {
    const deployment = await this.prisma.deploymentHistory.findUnique({
      where: { id: deploymentId },
    });

    if (!deployment) {
      throw new Error('Deployment not found');
    }

    // Map status to phase and progress
    let phase: DeploymentProgress['phase'];
    let progress: number;
    let message: string;

    switch (deployment.status) {
      case DeploymentStatus.PENDING:
        phase = 'pending';
        progress = 0;
        message = 'Deployment queued';
        break;
      case DeploymentStatus.BUILDING:
        phase = 'building';
        progress = 33;
        message = 'Building project...';
        break;
      case DeploymentStatus.UPLOADING:
        phase = 'uploading';
        progress = 66;
        message = 'Uploading to platform...';
        break;
      case DeploymentStatus.SUCCESS:
        phase = 'complete';
        progress = 100;
        message = 'Deployment successful';
        break;
      case DeploymentStatus.FAILED:
        phase = 'failed';
        progress = 0;
        message = 'Deployment failed';
        break;
    }

    return {
      id: deployment.id,
      status: deployment.status,
      phase,
      progress,
      message,
      logs: deployment.buildLogs,
      deployedUrl: deployment.deployedUrl || undefined,
      error: deployment.errorMessage || undefined,
    };
  }

  /**
   * Get deployment history for a project
   */
  async getHistory(
    projectId: string,
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ deployments: DeploymentHistory[]; total: number }> {
    // Verify project belongs to user
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!project) {
      throw new Error('Project not found or does not belong to user');
    }

    const [deployments, total] = await Promise.all([
      this.prisma.deploymentHistory.findMany({
        where: {
          config: {
            projectId,
          },
        },
        include: {
          config: {
            include: {
              account: {
                select: {
                  id: true,
                  type: true,
                  email: true,
                  username: true,
                },
              },
            },
          },
        },
        orderBy: {
          startedAt: 'desc',
        },
        take: Math.min(limit, 100), // Max 100
        skip: offset,
      }),
      this.prisma.deploymentHistory.count({
        where: {
          config: {
            projectId,
          },
        },
      }),
    ]);

    return { deployments, total };
  }

  /**
   * Retry a failed deployment
   */
  async retryDeployment(
    deploymentId: string,
    userId: string
  ): Promise<DeploymentHistory> {
    const originalDeployment = await this.prisma.deploymentHistory.findUnique({
      where: { id: deploymentId },
      include: {
        config: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!originalDeployment) {
      throw new Error('Deployment not found');
    }

    // Verify project belongs to user
    if (originalDeployment.config.project.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // Only allow retry for failed deployments
    if (originalDeployment.status !== DeploymentStatus.FAILED) {
      throw new Error('Can only retry failed deployments');
    }

    // Trigger new deployment with same config
    return this.triggerDeployment(
      originalDeployment.config.projectId,
      originalDeployment.configId,
      userId
    );
  }

  /**
   * Update deployment record
   */
  private async updateDeployment(
    deploymentId: string,
    data: Partial<DeploymentHistory>
  ): Promise<void> {
    await this.prisma.deploymentHistory.update({
      where: { id: deploymentId },
      data,
    });
  }

  /**
   * Append to build logs
   */
  private async appendLog(deploymentId: string, log: string): Promise<void> {
    const deployment = await this.prisma.deploymentHistory.findUnique({
      where: { id: deploymentId },
      select: { buildLogs: true },
    });

    if (deployment) {
      await this.prisma.deploymentHistory.update({
        where: { id: deploymentId },
        data: {
          buildLogs: deployment.buildLogs + log,
        },
      });
    }
  }

  /**
   * Create wrangler.jsonc configuration for Cloudflare Pages
   */
  private async createWranglerConfig(
    buildOutputDir: string,
    projectName: string
  ): Promise<void> {
    const wranglerConfig = {
      $schema: './node_modules/wrangler/config-schema.json',
      name: projectName,
      compatibility_date: new Date().toISOString().split('T')[0],
      assets: {
        directory: '.',
        not_found_handling: 'single-page-application',
      },
    };

    const configPath = path.join(buildOutputDir, 'wrangler.jsonc');
    const configContent = JSON.stringify(wranglerConfig, null, 2);
    await fs.writeFile(configPath, configContent);

    console.log(
      `Created wrangler.jsonc configuration at ${configPath}:`,
      wranglerConfig
    );

    // List files in build output directory for debugging
    const files = await fs.readdir(buildOutputDir);
    console.log(`Files in build output directory (${buildOutputDir}):`, files);

    // Check for index.html
    const hasIndexHtml = files.includes('index.html');
    console.log(`Has index.html in root: ${hasIndexHtml}`);

    if (!hasIndexHtml) {
      console.warn(
        'WARNING: No index.html found in build output root. This may cause 500 errors on the deployed site.'
      );
    }
  }
}
