import { PrismaClient, DeploymentConfig, DeploymentType } from '@prisma/client';

export interface CreateConfigDto {
  accountId: string;
  type: DeploymentType;
  githubRepo?: string;
  githubBranch?: string;
  cloudflareProjectName?: string;
  cloudflareBranch?: string;
}

export interface UpdateConfigDto {
  githubRepo?: string;
  githubBranch?: string;
  cloudflareProjectName?: string;
  cloudflareBranch?: string;
}

/**
 * Service for managing deployment configurations
 * Handles CRUD operations and validation
 */
export class DeploymentConfigService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a new deployment configuration
   */
  async createConfig(
    projectId: string,
    userId: string,
    data: CreateConfigDto
  ): Promise<DeploymentConfig> {
    // Verify account belongs to user
    const account = await this.prisma.deploymentAccount.findFirst({
      where: {
        id: data.accountId,
        userId,
      },
    });

    if (!account) {
      throw new Error('Account not found or does not belong to user');
    }

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

    // Validate required fields based on type
    if (data.type === DeploymentType.GITHUB_PAGES) {
      if (!data.githubRepo) {
        throw new Error(
          'GitHub repository is required for GitHub Pages deployment'
        );
      }
    } else if (data.type === DeploymentType.CLOUDFLARE_PAGES) {
      if (!data.cloudflareProjectName) {
        throw new Error(
          'Cloudflare project name is required for Cloudflare Pages deployment'
        );
      }
    }

    // Check for duplicate configs
    const existingConfig = await this.prisma.deploymentConfig.findFirst({
      where: {
        projectId,
        accountId: data.accountId,
        type: data.type,
      },
    });

    if (existingConfig) {
      throw new Error(
        'A deployment configuration with this account and type already exists for this project'
      );
    }

    // Create config
    const config = await this.prisma.deploymentConfig.create({
      data: {
        projectId,
        accountId: data.accountId,
        type: data.type,
        githubRepo: data.githubRepo,
        githubBranch:
          data.githubBranch ||
          (data.type === DeploymentType.GITHUB_PAGES ? 'gh-pages' : undefined),
        cloudflareProjectName: data.cloudflareProjectName,
        cloudflareBranch:
          data.cloudflareBranch ||
          (data.type === DeploymentType.CLOUDFLARE_PAGES ? 'main' : undefined),
      },
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
    });

    return config;
  }

  /**
   * Update a deployment configuration
   */
  async updateConfig(
    configId: string,
    userId: string,
    data: UpdateConfigDto
  ): Promise<DeploymentConfig> {
    // Verify config belongs to user's project
    const config = await this.prisma.deploymentConfig.findFirst({
      where: {
        id: configId,
        project: {
          userId,
        },
      },
    });

    if (!config) {
      throw new Error('Configuration not found or does not belong to user');
    }

    // Update config
    const updated = await this.prisma.deploymentConfig.update({
      where: { id: configId },
      data: {
        githubRepo: data.githubRepo,
        githubBranch: data.githubBranch,
        cloudflareProjectName: data.cloudflareProjectName,
        cloudflareBranch: data.cloudflareBranch,
      },
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
    });

    return updated;
  }

  /**
   * Delete a deployment configuration
   */
  async deleteConfig(configId: string, userId: string): Promise<void> {
    // Verify config belongs to user's project
    const config = await this.prisma.deploymentConfig.findFirst({
      where: {
        id: configId,
        project: {
          userId,
        },
      },
    });

    if (!config) {
      throw new Error('Configuration not found or does not belong to user');
    }

    // Delete config (will cascade delete deployment history)
    await this.prisma.deploymentConfig.delete({
      where: { id: configId },
    });
  }

  /**
   * Get all configurations for a project
   */
  async getConfigs(
    projectId: string,
    userId: string
  ): Promise<DeploymentConfig[]> {
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

    return this.prisma.deploymentConfig.findMany({
      where: { projectId },
      include: {
        account: {
          select: {
            id: true,
            type: true,
            email: true,
            username: true,
            organization: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get a single configuration by ID
   */
  async getConfig(configId: string): Promise<DeploymentConfig> {
    const config = await this.prisma.deploymentConfig.findUnique({
      where: { id: configId },
      include: {
        account: {
          select: {
            id: true,
            type: true,
            email: true,
            username: true,
            organization: true,
          },
        },
      },
    });

    if (!config) {
      throw new Error('Configuration not found');
    }

    return config;
  }

  /**
   * Verify a user has access to a config
   */
  async verifyConfigAccess(configId: string, userId: string): Promise<boolean> {
    const config = await this.prisma.deploymentConfig.findFirst({
      where: {
        id: configId,
        project: {
          userId,
        },
      },
    });

    return !!config;
  }
}
