import Docker from 'dockerode';
import { PassThrough } from 'stream';
import { logger } from '../lib/logger';
import { SandboxProvisioningService } from './sandboxProvisioning';
import {
  ALLOWED_SANDBOX_COMMANDS,
  BLOCKED_COMMAND_PATTERNS,
} from '../config/sandboxSecurity.js';

export interface ShellCommandRequest {
  sandboxId: string;
  command: string;
  args?: string[];
  stdin?: string; // Input stream for the command
  workingDir?: string;
  timeout?: number; // seconds
  env?: Record<string, string>;
  userId?: string; // For authentication and logging
}

export interface ShellCommandResponse {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number; // milliseconds
  error?: string;
}

export interface CommandValidationResult {
  allowed: boolean;
  reason?: string;
  sanitizedCommand?: string;
  sanitizedArgs?: string[];
}

export class SandboxShellRunner {
  private docker: Docker;
  private sandboxService: SandboxProvisioningService;

  private readonly defaultTimeout = 30; // 30 seconds
  private readonly maxTimeout = 300; // 5 minutes

  constructor(sandboxService: SandboxProvisioningService) {
    this.docker = new Docker({
      socketPath: '/var/run/docker.sock',
    });
    this.sandboxService = sandboxService;

    logger.info('SandboxShellRunner initialized');
  }

  /**
   * Execute a shell command in a sandbox container
   */
  async executeCommand(
    request: ShellCommandRequest
  ): Promise<ShellCommandResponse> {
    const startTime = Date.now();

    try {
      logger.info('Executing command in sandbox', {
        sandboxId: request.sandboxId,
        command: request.command,
        args: request.args,
      });

      // Validate sandbox exists and is ready
      const sandbox = await this.sandboxService.getSandbox(request.sandboxId);
      if (!sandbox) {
        throw new Error('Sandbox not found');
      }

      if (sandbox.status !== 'READY') {
        throw new Error(`Sandbox not ready (status: ${sandbox.status})`);
      }

      if (!sandbox.containerId) {
        throw new Error('Sandbox container ID not available');
      }

      // Update activity timestamp
      await this.sandboxService.updateActivity(request.sandboxId);

      // Validate and sanitize command
      const validation = this.validateCommand(request.command, request.args);
      if (!validation.allowed) {
        throw new Error(`Command not allowed: ${validation.reason}`);
      }

      // Get container reference
      logger.debug(
        'SandboxShellRunner.executeCommand - Getting container reference',
        {
          containerId: sandbox.containerId,
        }
      );

      const container = this.docker.getContainer(sandbox.containerId);

      // Prepare execution options
      const timeout = Math.min(
        request.timeout || this.defaultTimeout,
        this.maxTimeout
      );
      const workingDir = request.workingDir || '/workspace';

      const execOptions = {
        Cmd: [
          validation.sanitizedCommand!,
          ...(validation.sanitizedArgs || []),
        ],
        AttachStdout: true,
        AttachStderr: true,
        AttachStdin: !!request.stdin, // Enable stdin only if provided
        Tty: false,
        User: '1000:1000', // Match container user for consistency
        WorkingDir: workingDir,
        Env: request.env
          ? Object.entries(request.env).map(([k, v]) => `${k}=${v}`)
          : undefined,
      };

      logger.debug(
        'SandboxShellRunner.executeCommand - Prepared exec options',
        {
          cmd: execOptions.Cmd,
          workingDir: execOptions.WorkingDir,
          timeout,
          hasStdin: !!request.stdin,
        }
      );

      // Create exec instance
      logger.debug(
        'SandboxShellRunner.executeCommand - Creating exec instance'
      );
      const exec = await container.exec(execOptions);

      // Execute with timeout
      logger.debug(
        'SandboxShellRunner.executeCommand - Executing with timeout',
        {
          timeout,
          hasStdin: !!request.stdin,
        }
      );

      const result = await this.executeWithTimeout(
        exec,
        timeout,
        request.stdin
      );

      const executionTime = Date.now() - startTime;

      logger.info('SandboxShellRunner.executeCommand - Command executed', {
        sandboxId: request.sandboxId,
        command: request.command,
        exitCode: result.exitCode,
        executionTime,
        stdoutLength: result.stdout.length,
        stderrLength: result.stderr.length,
        success: result.exitCode === 0,
        stdout: result.stdout.substring(0, 100),
        stderr: result.stderr.substring(0, 100),
      });

      return {
        success: result.exitCode === 0,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      logger.error('Command execution failed', {
        sandboxId: request.sandboxId,
        command: request.command,
        error: errorMessage,
        executionTime,
      });

      return {
        success: false,
        stdout: '',
        stderr: errorMessage,
        exitCode: -1,
        executionTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Validate and sanitize shell command for security
   */
  private validateCommand(
    command: string,
    args?: string[]
  ): CommandValidationResult {
    // Check if command is in allowed list
    if (!ALLOWED_SANDBOX_COMMANDS.has(command)) {
      return {
        allowed: false,
        reason: `Command '${command}' is not in the allowed list`,
      };
    }

    // Check for dangerous patterns in command
    const fullCommand = `${command} ${(args || []).join(' ')}`;
    for (const pattern of BLOCKED_COMMAND_PATTERNS) {
      if (pattern.test(fullCommand)) {
        return {
          allowed: false,
          reason: `Command contains blocked pattern: ${pattern.source}`,
        };
      }
    }

    // Sanitize arguments
    const sanitizedArgs = args?.map(arg => this.sanitizeArgument(arg)) || [];

    // Additional validation for specific commands
    if (command === 'rm') {
      // Check for dangerous rm operations
      const hasRf = sanitizedArgs.some(
        arg => arg.includes('-rf') || arg.includes('-fr')
      );
      const paths = sanitizedArgs.filter(arg => !arg.startsWith('-'));

      // Block rm -rf / or rm -rf /* or any root-level deletion
      if (
        hasRf &&
        paths.some(p => p === '/' || p.startsWith('/*') || p === '/*')
      ) {
        return {
          allowed: false,
          reason: 'Dangerous rm command: Cannot delete root directory',
        };
      }

      // Block rm outside /workspace
      if (paths.some(p => p.startsWith('/') && !p.startsWith('/workspace'))) {
        return {
          allowed: false,
          reason: 'rm operations are only allowed within /workspace directory',
        };
      }
    }

    if (command === 'chmod' && sanitizedArgs.some(arg => arg.includes('777'))) {
      return {
        allowed: false,
        reason: 'Overly permissive chmod detected',
      };
    }

    return {
      allowed: true,
      sanitizedCommand: command,
      sanitizedArgs,
    };
  }

  /**
   * Sanitize command argument
   */
  private sanitizeArgument(arg: string): string {
    // Remove potentially dangerous characters
    return arg
      .replace(/[;&|`$(){}[\]]/g, '') // Remove shell metacharacters
      .replace(/\.\./g, '') // Remove parent directory references
      .trim();
  }

  /**
   * Execute command with timeout handling
   */
  private async executeWithTimeout(
    exec: Docker.Exec,
    timeoutSeconds: number,
    stdin?: string
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let exitCode = 0;
      let finished = false;
      const commandStartTime = Date.now(); // Track when command actually starts

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        if (!finished) {
          finished = true;
          logger.warn('SandboxShellRunner - Command timed out', {
            timeoutSeconds,
            bytesReceived: stdout.length + stderr.length,
            stdoutPreview: stdout.substring(0, 500),
            stderrPreview: stderr.substring(0, 500),
          });
          reject(
            new Error(`Command timed out after ${timeoutSeconds} seconds`)
          );
        }
      }, timeoutSeconds * 1000);

      // Start execution
      exec.start({ hijack: true, stdin: !!stdin }, (err, stream) => {
        if (err) {
          clearTimeout(timeoutHandle);
          if (!finished) {
            finished = true;
            reject(err);
          }
          return;
        }

        if (!stream) {
          clearTimeout(timeoutHandle);
          if (!finished) {
            finished = true;
            reject(new Error('No stream returned from exec'));
          }
          return;
        }

        // If stdin is provided, write it to the stream
        if (stdin) {
          stream.write(stdin);
          stream.end();
        }

        // Demultiplex stdout and stderr
        const stdoutStream = new PassThrough();
        const stderrStream = new PassThrough();

        this.docker.modem.demuxStream(stream, stdoutStream, stderrStream);

        // Track progress for long-running commands
        let lastLogTime = Date.now();
        let totalBytesReceived = 0;
        const logInterval = 5000; // Log every 5 seconds

        // Collect stdout
        stdoutStream.on('data', (chunk: Buffer) => {
          stdout += chunk.toString();
          totalBytesReceived += chunk.length;

          // Log progress every 5 seconds to show command is still running
          const now = Date.now();
          if (now - lastLogTime > logInterval) {
            const elapsedSeconds = Math.floor((now - commandStartTime) / 1000);
            logger.info('SandboxShellRunner - Command progress', {
              elapsedSeconds,
              timeoutSeconds,
              percentComplete: Math.floor(
                (elapsedSeconds / timeoutSeconds) * 100
              ),
              bytesReceived: totalBytesReceived,
              stdoutLines: stdout.split('\n').length,
              lastOutput: chunk.toString().substring(0, 200),
            });
            lastLogTime = now;
          }
        });

        // Collect stderr
        stderrStream.on('data', (chunk: Buffer) => {
          stderr += chunk.toString();
          totalBytesReceived += chunk.length;

          // Log stderr output immediately as it often contains progress info
          const stderrChunk = chunk.toString();
          if (stderrChunk.trim().length > 0) {
            logger.info('SandboxShellRunner - stderr output', {
              output: stderrChunk.substring(0, 300),
            });
          }
        });

        // Handle stream end
        stream.on('end', () => {
          // Get exit code
          exec.inspect((err, data) => {
            clearTimeout(timeoutHandle);
            if (!finished) {
              finished = true;
              if (err) {
                reject(err);
              } else {
                exitCode = data?.ExitCode || 0;
                const totalElapsedSeconds = Math.floor(
                  (Date.now() - commandStartTime) / 1000
                );
                logger.info('SandboxShellRunner - Command completed', {
                  exitCode,
                  totalElapsedSeconds,
                  totalBytesReceived,
                  stdoutLines: stdout.split('\n').length,
                  stderrLines: stderr.split('\n').length,
                });
                resolve({ stdout, stderr, exitCode });
              }
            }
          });
        });

        // Handle stream errors
        stream.on('error', error => {
          clearTimeout(timeoutHandle);
          if (!finished) {
            finished = true;
            reject(error);
          }
        });
      });
    });
  }

  /**
   * Get resource usage for a sandbox
   */
  async getResourceUsage(sandboxId: string): Promise<{
    cpu: number;
    memory: number;
    network: { rx: number; tx: number };
    processes: number;
  }> {
    const sandbox = await this.sandboxService.getSandbox(sandboxId);
    if (!sandbox || !sandbox.containerId) {
      throw new Error('Sandbox not found');
    }

    const container = this.docker.getContainer(sandbox.containerId);
    const stats = await container.stats({ stream: false });

    // Calculate CPU usage percentage
    const cpuDelta =
      stats.cpu_stats.cpu_usage.total_usage -
      stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta =
      stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const cpuPercent =
      (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100;

    // Calculate memory usage
    const memoryUsage = stats.memory_stats.usage || 0;
    const memoryLimit = stats.memory_stats.limit || 0;
    const memoryPercent =
      memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100 : 0;

    // Network stats
    const networks = stats.networks || {};
    let rxBytes = 0;
    let txBytes = 0;

    Object.values(networks).forEach((network: any) => {
      rxBytes += network.rx_bytes || 0;
      txBytes += network.tx_bytes || 0;
    });

    // Process count
    const processes = stats.pids_stats?.current || 0;

    return {
      cpu: Math.round(cpuPercent * 100) / 100,
      memory: Math.round(memoryPercent * 100) / 100,
      network: { rx: rxBytes, tx: txBytes },
      processes,
    };
  }

  /**
   * Kill a running process in the sandbox
   */
  async killProcess(sandboxId: string, pid: number): Promise<boolean> {
    try {
      const result = await this.executeCommand({
        sandboxId,
        command: 'kill',
        args: [pid.toString()],
        timeout: 5,
      });

      return result.success;
    } catch (error) {
      logger.error('Failed to kill process', { sandboxId, pid, error });
      return false;
    }
  }

  /**
   * List running processes in the sandbox
   */
  async listProcesses(sandboxId: string): Promise<
    Array<{
      pid: number;
      command: string;
      cpu: string;
      memory: string;
    }>
  > {
    try {
      const result = await this.executeCommand({
        sandboxId,
        command: 'ps',
        args: ['aux', '--no-headers'],
        timeout: 10,
      });

      if (!result.success) {
        return [];
      }

      return result.stdout
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const parts = line.trim().split(/\s+/);
          return {
            pid: parseInt(parts[1]) || 0,
            command: parts.slice(10).join(' ') || '',
            cpu: parts[2] || '0',
            memory: parts[3] || '0',
          };
        })
        .filter(proc => proc.pid > 0);
    } catch (error) {
      logger.error('Failed to list processes', { sandboxId, error });
      return [];
    }
  }
}
