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

    return this.shellRunner.executeCommand(request);
  }

  /**
   * Get sandbox information
   */
  getSandboxInfo(sandboxId: string) {
    return this.provisioningService.getSandbox(sandboxId);
  }

  /**
   * Destroy a sandbox
   */
  async destroySandbox(sandboxId: string): Promise<boolean> {
    return this.provisioningService.destroySandbox(sandboxId);
  }

  /**
   * Get all sandboxes for a user
   */
  getUserSandboxes(userId: string) {
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
    const destroyPromises = allSandboxes.map(sandbox =>
      this.provisioningService.destroySandbox(sandbox.id)
    );

    await Promise.allSettled(destroyPromises);

    logger.info('SandboxManager shutdown complete');
  }
}

// Singleton instance
export const sandboxManager = new SandboxManager();
