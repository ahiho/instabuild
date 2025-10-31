import Docker from 'dockerode';
import { PassThrough } from 'stream';
import { logger } from '../lib/logger';
import { SandboxProvisioningService } from './sandboxProvisioning';

export interface ShellCommandRequest {
  sandboxId: string;
  command: string;
  args?: string[];
  workingDir?: string;
  timeout?: number; // seconds
  env?: Record<string, string>;
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

  // Security: Allowed commands for sandbox execution
  private readonly allowedCommands = new Set([
    // File operations
    'ls',
    'cat',
    'head',
    'tail',
    'find',
    'grep',
    'wc',
    'sort',
    'uniq',
    'mkdir',
    'rmdir',
    'rm',
    'cp',
    'mv',
    'touch',
    'chmod',
    'chown',
    'test', // Phase 3.5: File/directory existence checks
    'stat', // Phase 3.5: File metadata
    'tee', // Phase 3.5: Write files (for containerFilesystem)

    // Text processing and search
    'sed',
    'awk',
    'cut',
    'tr',
    'diff',
    'patch',
    'rg', // ripgrep - for fast file searching and globbing

    // Development tools
    'npm',
    'node',
    'git',
    'curl',
    'wget',

    // Build tools
    'vite',
    'tsc',
    'eslint',
    'prettier',

    // System info (safe)
    'pwd',
    'whoami',
    'id',
    'uname',
    'date',
    'echo',

    // Process management (limited)
    'ps',
    'kill',
    'killall',
  ]);

  // Security: Dangerous command patterns to block
  private readonly blockedPatterns = [
    /sudo/i,
    /^su\s/i, // Only block 'su ' at start of command
    /\ssu\s/i, // Or 'su ' in the middle (not in file paths)
    /passwd/i,
    /adduser/i,
    /deluser/i,
    /mount/i,
    /umount/i,
    /iptables/i,
    /netstat/i,
    /^ss\s/i, // Only block 'ss ' at start of command (the network tool)
    /^nc\s/i, // Only block 'nc ' at start
    /\snc\s/i, // Or 'nc ' in the middle
    /netcat/i,
    /telnet/i,
    /ssh/i,
    /scp/i,
    /rsync/i,
    /docker/i,
    /systemctl/i,
    /service/i,
    /crontab/i,
    /^at\s/i, // Only block 'at ' at start
    /batch/i,
    /nohup/i,
    /screen/i,
    /tmux/i,
    />&/, // Redirection that could be dangerous
    /\|&/, // Pipe with stderr
    /;.*rm\s+-rf/i, // Dangerous rm commands
    /rm\s+-rf\s+\//i, // Root deletion attempts
  ];

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
        AttachStdin: false,
        Tty: false,
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
        }
      );

      const result = await this.executeWithTimeout(exec, timeout);

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
    if (!this.allowedCommands.has(command)) {
      return {
        allowed: false,
        reason: `Command '${command}' is not in the allowed list`,
      };
    }

    // Check for dangerous patterns in command
    const fullCommand = `${command} ${(args || []).join(' ')}`;
    for (const pattern of this.blockedPatterns) {
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
    if (
      command === 'rm' &&
      sanitizedArgs.some(arg => arg.includes('-rf') && arg.includes('/'))
    ) {
      return {
        allowed: false,
        reason: 'Dangerous rm command detected',
      };
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
    timeoutSeconds: number
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let exitCode = 0;
      let finished = false;

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        if (!finished) {
          finished = true;
          reject(
            new Error(`Command timed out after ${timeoutSeconds} seconds`)
          );
        }
      }, timeoutSeconds * 1000);

      // Start execution
      exec.start({ hijack: true, stdin: false }, (err, stream) => {
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

        // Demultiplex stdout and stderr
        const stdoutStream = new PassThrough();
        const stderrStream = new PassThrough();

        this.docker.modem.demuxStream(stream, stdoutStream, stderrStream);

        // Collect stdout
        stdoutStream.on('data', (chunk: Buffer) => {
          stdout += chunk.toString();
        });

        // Collect stderr
        stderrStream.on('data', (chunk: Buffer) => {
          stderr += chunk.toString();
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
