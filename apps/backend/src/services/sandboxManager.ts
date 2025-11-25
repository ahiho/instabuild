import { logger } from '../lib/logger';
import {
  SandboxProvisioningService,
  SandboxProvisionRequest,
  SandboxProvisionResponse,
} from './sandboxProvisioning';
import {
  SandboxShellRunner,
  ShellCommandRequest,
  ShellCommandResponse,
} from './sandboxShellRunner';

/**
 * Central manager for all sandbox-related operations
 * Coordinates between provisioning and shell execution services
 */
export class SandboxManager {
  private provisioningService: SandboxProvisioningService;
  private shellRunner: SandboxShellRunner;
  private initialized = false;

  constructor() {
    this.provisioningService = new SandboxProvisioningService();
    this.shellRunner = new SandboxShellRunner(this.provisioningService);

    // Set up event listeners
    this.setupEventListeners();

    logger.info('SandboxManager initialized');
  }

  /**
   * Initialize the sandbox manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Perform health check
      const health = await this.provisioningService.healthCheck();
      if (health.status === 'unhealthy') {
        throw new Error(
          `Sandbox service unhealthy: ${JSON.stringify(health.details)}`
        );
      }

      this.initialized = true;
      logger.info('SandboxManager initialized successfully', health.details);
    } catch (error) {
      logger.error('Failed to initialize SandboxManager', { error });
      throw error;
    }
  }

  /**
   * Provision a new sandbox for a user
   */
  async createSandbox(
    request: SandboxProvisionRequest
  ): Promise<SandboxProvisionResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Validate user authentication for sandbox creation
    if (!request.userId || request.userId === 'system') {
      throw new Error(
        'Valid user authentication required for sandbox creation'
      );
    }

    logger.info('Creating sandbox for authenticated user', {
      userId: request.userId,
      projectId: request.projectId,
    });

    return this.provisioningService.provisionSandbox(request);
  }

  /**
   * Execute a shell command in a sandbox
   */
  async executeCommand(
    request: ShellCommandRequest
  ): Promise<ShellCommandResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Validate user context for command execution
    if (!request.userId) {
      throw new Error(
        'User authentication required for sandbox command execution'
      );
    }

    logger.info('SandboxManager.executeCommand - delegating to shellRunner', {
      sandboxId: request.sandboxId,
      command: request.command,
      args: request.args,
      userId: request.userId,
    });

    const result = await this.shellRunner.executeCommand(request);

    logger.info('SandboxManager.executeCommand - result received', {
      sandboxId: request.sandboxId,
      command: request.command,
      success: result.success,
      exitCode: result.exitCode,
      hasStderr: result.stderr.length > 0,
      stderrLength: result.stderr.length,
      hasStdout: result.stdout.length > 0,
      stdoutLength: result.stdout.length,
    });

    return result;
  }

  /**
   * Get sandbox information from database by projectId
   * Used by health checks and other services that work at the project level
   */
  async getSandboxInfoByProjectId(projectId: string) {
    return this.provisioningService.getSandboxByProjectId(projectId);
  }

  /**
   * Get sandbox information from database by conversationId
   * Phase 3.5: Now async - queries from Conversation model
   */
  async getSandboxInfo(sandboxId: string) {
    return this.provisioningService.getSandbox(sandboxId);
  }

  /**
   * Destroy a sandbox
   */
  async destroySandbox(sandboxId: string, userId?: string): Promise<boolean> {
    if (userId) {
      logger.info('Destroying sandbox for user', { sandboxId, userId });
    }
    return this.provisioningService.destroySandbox(sandboxId);
  }

  /**
   * Get all sandboxes for a user
   */
  getUserSandboxes(userId: string) {
    if (!userId) {
      throw new Error('User ID required to retrieve sandboxes');
    }

    logger.info('Retrieving sandboxes for user', { userId });
    return this.provisioningService.getUserSandboxes(userId);
  }

  /**
   * Get resource usage for a sandbox
   */
  async getResourceUsage(sandboxId: string) {
    return this.shellRunner.getResourceUsage(sandboxId);
  }

  /**
   * List processes in a sandbox
   */
  async listProcesses(sandboxId: string) {
    return this.shellRunner.listProcesses(sandboxId);
  }

  /**
   * Kill a process in a sandbox
   */
  async killProcess(sandboxId: string, pid: number) {
    return this.shellRunner.killProcess(sandboxId, pid);
  }

  /**
   * Get container logs using Docker API
   */
  async getContainerLogs(
    sandboxId: string,
    options?: {
      tail?: number;
      since?: number;
      timestamps?: boolean;
    }
  ) {
    return this.provisioningService.getContainerLogs(sandboxId, options);
  }

  /**
   * Health check for the entire sandbox system
   */
  async healthCheck() {
    return this.provisioningService.healthCheck();
  }

  /**
   * Set up event listeners for cross-service communication
   */
  private setupEventListeners(): void {
    this.provisioningService.on('sandbox-provisioned', sandbox => {
      logger.info('Sandbox provisioned', {
        sandboxId: sandbox.id,
        userId: sandbox.userId,
      });
    });

    this.provisioningService.on('sandbox-destroyed', sandbox => {
      logger.info('Sandbox destroyed', {
        sandboxId: sandbox.id,
        userId: sandbox.userId,
      });
    });
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down SandboxManager...');

    // Get all active sandboxes
    const allSandboxes = Array.from(
      (this.provisioningService as any).containers.values()
    );

    // Destroy all active sandboxes
    const destroyPromises = allSandboxes.map((sandbox: any) =>
      this.provisioningService.destroySandbox(sandbox.id)
    );

    await Promise.allSettled(destroyPromises);

    logger.info('SandboxManager shutdown complete');
  }
}

// Singleton instance
export const sandboxManager = new SandboxManager();
