import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import Dockerode from 'dockerode';
import * as tar from 'tar';

const execAsync = promisify(exec);

export interface BuildResult {
  success: boolean;
  buildLogs: string;
  outputDir: string; // Path to the built files
  error?: string;
  duration: number; // milliseconds
}

/**
 * Service for building projects from sandbox containers
 * Extracts files, runs build commands, and captures logs
 */
export class BuildService {
  private docker: Dockerode;
  private readonly BUILD_TIMEOUT_MS: number;
  private readonly MAX_LOG_SIZE: number;

  constructor() {
    this.docker = new Dockerode();
    this.BUILD_TIMEOUT_MS = parseInt(
      process.env.DEPLOYMENT_BUILD_TIMEOUT_MS || '600000',
      10
    ); // 10 minutes
    this.MAX_LOG_SIZE = parseInt(
      process.env.DEPLOYMENT_MAX_BUILD_LOG_SIZE || '1048576',
      10
    ); // 1 MB
  }

  /**
   * Extract files from sandbox container to a temporary directory
   */
  async extractFilesFromSandbox(containerId: string): Promise<string> {
    try {
      const container = this.docker.getContainer(containerId);

      // Create temporary directory
      const tempDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'instabuild-deploy-')
      );

      // Get tar stream from container's /workspace
      const stream = await container.getArchive({
        path: '/workspace',
      });

      // Extract tar stream to temp directory
      await new Promise<void>((resolve, reject) => {
        stream
          .pipe(
            tar.extract({
              cwd: tempDir,
              strip: 1, // Remove 'workspace' parent directory
            })
          )
          .on('finish', resolve)
          .on('error', reject);
      });

      console.log(
        `Extracted files from container ${containerId} to ${tempDir}`
      );
      return tempDir;
    } catch (error) {
      console.error('Error extracting files from sandbox:', error);
      throw new Error(
        `Failed to extract files from sandbox: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Run build command in the extracted directory
   */
  async runBuild(workingDir: string, basePath?: string): Promise<BuildResult> {
    const startTime = Date.now();
    let buildLogs = '';

    console.log('[BuildService] Starting build process', { workingDir });

    try {
      // Check if package.json exists
      const packageJsonPath = path.join(workingDir, 'package.json');
      let hasPackageJson = false;

      try {
        await fs.access(packageJsonPath);
        hasPackageJson = true;
        console.log('[BuildService] package.json found');
      } catch {
        // No package.json, skip dependency installation
        console.log('[BuildService] No package.json found');
        buildLogs +=
          'No package.json found, skipping dependency installation\n';
      }

      // Install dependencies if package.json exists
      if (hasPackageJson) {
        console.log('[BuildService] Installing dependencies with pnpm');
        buildLogs += '=== Installing dependencies ===\n';

        // Check pnpm availability on host
        try {
          console.log('[BuildService] Checking pnpm availability on host');
          const { stdout: pnpmVersion } = await execAsync(
            'which pnpm && pnpm --version'
          );
          console.log('[BuildService] pnpm available:', pnpmVersion.trim());
          buildLogs += `pnpm version: ${pnpmVersion.trim()}\n`;
        } catch (pnpmCheckError) {
          console.error(
            '[BuildService] pnpm not found on host:',
            pnpmCheckError
          );
          buildLogs += 'WARNING: pnpm not found on host system\n';
        }

        // Read package.json for debugging
        try {
          const packageJson = await fs.readFile(packageJsonPath, 'utf-8');
          console.log(
            '[BuildService] package.json content (first 500 chars):',
            packageJson.substring(0, 500)
          );
          buildLogs += `package.json found at ${packageJsonPath}\n`;
        } catch (readError) {
          console.error(
            '[BuildService] Failed to read package.json:',
            readError
          );
        }

        // List directory contents
        try {
          const { stdout: lsOutput } = await execAsync('ls -la', {
            cwd: workingDir,
          });
          console.log('[BuildService] Directory contents:', lsOutput);
          buildLogs += `Working directory: ${workingDir}\n`;
        } catch (lsError) {
          console.error('[BuildService] Failed to list directory:', lsError);
        }

        // Run pnpm install
        const installStartTime = Date.now();
        console.log(
          '[BuildService] Running: pnpm install --prefer-offline (with CI=true)'
        );

        try {
          const { stdout: installStdout, stderr: installStderr } =
            await execAsync('pnpm install --prefer-offline', {
              cwd: workingDir,
              timeout: this.BUILD_TIMEOUT_MS / 2,
              maxBuffer: this.MAX_LOG_SIZE,
              env: {
                ...process.env,
                CI: 'true', // Tell pnpm we're in CI mode (non-interactive)
              },
            });

          const installDuration = Date.now() - installStartTime;
          console.log('[BuildService] pnpm install completed', {
            duration: installDuration,
            stdoutLength: installStdout.length,
            stderrLength: installStderr.length,
          });

          buildLogs += installStdout;
          if (installStderr) {
            buildLogs += `STDERR: ${installStderr}\n`;
            console.log(
              '[BuildService] pnpm install stderr:',
              installStderr.substring(0, 1000)
            );
          }

          buildLogs += `\nDependency installation completed in ${installDuration}ms\n`;
        } catch (error) {
          const installDuration = Date.now() - installStartTime;
          const errorMsg =
            error instanceof Error ? error.message : 'Unknown error';

          console.error('[BuildService] pnpm install failed', {
            duration: installDuration,
            error: errorMsg,
            // @ts-ignore - exec error has stdout/stderr
            stdout: error?.stdout?.toString() || '',
            // @ts-ignore
            stderr: error?.stderr?.toString() || '',
          });

          buildLogs += `Dependency installation failed after ${installDuration}ms\n`;
          buildLogs += `Error: ${errorMsg}\n`;

          // @ts-ignore - exec error has stdout/stderr
          if (error?.stdout) {
            // @ts-ignore
            buildLogs += `\nSTDOUT:\n${error.stdout.toString()}\n`;
          }
          // @ts-ignore
          if (error?.stderr) {
            // @ts-ignore
            buildLogs += `\nSTDERR:\n${error.stderr.toString()}\n`;
          }

          return {
            success: false,
            buildLogs: this.truncateLogs(buildLogs),
            outputDir: workingDir,
            error: `Dependency installation failed: ${errorMsg}`,
            duration: Date.now() - startTime,
          };
        }
      }

      // Check for build script in package.json
      const buildCommand = 'pnpm run build';

      if (hasPackageJson) {
        const packageJson = JSON.parse(
          await fs.readFile(packageJsonPath, 'utf-8')
        );
        if (!packageJson.scripts?.build) {
          // No build script, check for common output directories
          const distPath = path.join(workingDir, 'dist');
          const buildPath = path.join(workingDir, 'build');

          try {
            await fs.access(distPath);
            buildLogs += 'No build script found, but dist/ directory exists\n';
            return {
              success: true,
              buildLogs: this.truncateLogs(buildLogs),
              outputDir: distPath,
              duration: Date.now() - startTime,
            };
          } catch {
            // dist doesn't exist
          }

          try {
            await fs.access(buildPath);
            buildLogs += 'No build script found, but build/ directory exists\n';
            return {
              success: true,
              buildLogs: this.truncateLogs(buildLogs),
              outputDir: buildPath,
              duration: Date.now() - startTime,
            };
          } catch {
            // build doesn't exist
          }

          // No build script and no output directories - deploy workspace as-is
          buildLogs += 'No build script found, deploying workspace as-is\n';
          return {
            success: true,
            buildLogs: this.truncateLogs(buildLogs),
            outputDir: workingDir,
            duration: Date.now() - startTime,
          };
        }
      } else {
        // No package.json - deploy current directory
        buildLogs += 'No package.json found, deploying directory as-is\n';
        return {
          success: true,
          buildLogs: this.truncateLogs(buildLogs),
          outputDir: workingDir,
          duration: Date.now() - startTime,
        };
      }

      // Run build command
      const buildCommandStartTime = Date.now();
      console.log('[BuildService] Running build command:', buildCommand);

      // Check if vite.config exists and inject base path if needed
      const viteConfigPath = path.join(workingDir, 'vite.config.ts');
      try {
        let viteConfig = await fs.readFile(viteConfigPath, 'utf-8');
        console.log(
          '[BuildService] vite.config.ts found, first 500 chars:',
          viteConfig.substring(0, 500)
        );
        buildLogs += `\n=== Original vite.config.ts ===\n${viteConfig.substring(0, 500)}\n...\n`;

        // If basePath is set and vite.config doesn't have base configuration, inject it
        if (basePath && !viteConfig.includes('base:')) {
          console.log('[BuildService] Injecting base path into vite.config.ts');
          buildLogs +=
            '\nInjecting base path configuration into vite.config.ts...\n';

          // Find the defineConfig block and inject base path
          viteConfig = viteConfig.replace(
            /export default defineConfig\(\{/,
            "export default defineConfig({\n  base: process.env.BASE_PATH || '/',"
          );

          // Write updated config back
          await fs.writeFile(viteConfigPath, viteConfig, 'utf-8');
          console.log('[BuildService] Updated vite.config.ts with base path');
          buildLogs +=
            "Updated vite.config.ts to include: base: process.env.BASE_PATH || '/'\n";
        }
      } catch {
        console.log('[BuildService] No vite.config.ts found');
        buildLogs += '\nNote: No vite.config.ts found\n';
      }

      const buildEnv = {
        ...process.env,
        CI: 'true', // Tell build tools we're in CI mode
        ...(basePath ? { BASE_PATH: basePath } : {}), // Pass base path for GitHub Pages
      };

      if (basePath) {
        console.log('[BuildService] BASE_PATH environment variable:', basePath);
        console.log('[BuildService] Full build environment:', {
          CI: buildEnv.CI,
          BASE_PATH: buildEnv.BASE_PATH,
        });
        buildLogs += `\n=== Running build command: ${buildCommand} ===\n`;
        buildLogs += `BASE_PATH: ${basePath}\n`;
        buildLogs += 'CI: true\n';
      } else {
        console.log('[BuildService] No BASE_PATH set');
        buildLogs += `\n=== Running build command: ${buildCommand} ===\n`;
        buildLogs += 'BASE_PATH: not set (will use default /)\n';
      }

      try {
        const { stdout: buildStdout, stderr: buildStderr } = await execAsync(
          buildCommand,
          {
            cwd: workingDir,
            timeout: this.BUILD_TIMEOUT_MS / 2,
            maxBuffer: this.MAX_LOG_SIZE,
            env: buildEnv,
          }
        );

        const buildCommandDuration = Date.now() - buildCommandStartTime;
        console.log('[BuildService] Build command completed', {
          duration: buildCommandDuration,
          stdoutLength: buildStdout.length,
          stderrLength: buildStderr.length,
        });

        buildLogs += buildStdout;
        if (buildStderr) {
          buildLogs += `STDERR: ${buildStderr}\n`;
        }
      } catch (error) {
        const buildCommandDuration = Date.now() - buildCommandStartTime;
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';

        console.error('[BuildService] Build command failed', {
          duration: buildCommandDuration,
          error: errorMsg,
          // @ts-ignore
          stdout: error?.stdout?.toString() || '',
          // @ts-ignore
          stderr: error?.stderr?.toString() || '',
        });

        buildLogs += `Build failed after ${buildCommandDuration}ms: ${errorMsg}\n`;

        // @ts-ignore
        if (error?.stdout) {
          // @ts-ignore
          buildLogs += `\nSTDOUT:\n${error.stdout.toString()}\n`;
        }
        // @ts-ignore
        if (error?.stderr) {
          // @ts-ignore
          buildLogs += `\nSTDERR:\n${error.stderr.toString()}\n`;
        }

        return {
          success: false,
          buildLogs: this.truncateLogs(buildLogs),
          outputDir: workingDir,
          error: `Build failed: ${errorMsg}`,
          duration: Date.now() - startTime,
        };
      }

      // Determine output directory (dist, build, or root)
      let outputDir = workingDir;

      // Check common output directories
      const distPath = path.join(workingDir, 'dist');
      const buildPath = path.join(workingDir, 'build');
      const outPath = path.join(workingDir, 'out');

      try {
        await fs.access(distPath);
        outputDir = distPath;
        buildLogs += '\nUsing dist/ as output directory\n';
      } catch {
        try {
          await fs.access(buildPath);
          outputDir = buildPath;
          buildLogs += '\nUsing build/ as output directory\n';
        } catch {
          try {
            await fs.access(outPath);
            outputDir = outPath;
            buildLogs += '\nUsing out/ as output directory\n';
          } catch {
            buildLogs += `\nNo standard output directory found, using root: ${workingDir}\n`;
          }
        }
      }

      // Log index.html content to verify base path
      try {
        const indexPath = path.join(outputDir, 'index.html');
        const indexContent = await fs.readFile(indexPath, 'utf-8');
        console.log(
          '[BuildService] index.html content:',
          indexContent.substring(0, 1000)
        );
        buildLogs += `\n=== index.html preview (first 1000 chars) ===\n${indexContent.substring(0, 1000)}\n`;
      } catch (error) {
        console.log('[BuildService] Could not read index.html:', error);
        buildLogs += '\nNote: Could not read index.html for preview\n';
      }

      buildLogs += '\n=== Build completed successfully ===\n';

      return {
        success: true,
        buildLogs: this.truncateLogs(buildLogs),
        outputDir,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      buildLogs += `\nUnexpected error: ${errorMsg}\n`;
      return {
        success: false,
        buildLogs: this.truncateLogs(buildLogs),
        outputDir: workingDir,
        error: errorMsg,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Truncate logs if they exceed max size
   */
  private truncateLogs(logs: string): string {
    if (logs.length <= this.MAX_LOG_SIZE) {
      return logs;
    }

    const truncateMsg = `\n\n... (logs truncated, exceeded ${this.MAX_LOG_SIZE} bytes) ...\n\n`;
    const keepSize = this.MAX_LOG_SIZE - truncateMsg.length;
    const headSize = Math.floor(keepSize / 2);
    const tailSize = keepSize - headSize;

    return (
      logs.substring(0, headSize) +
      truncateMsg +
      logs.substring(logs.length - tailSize)
    );
  }

  /**
   * Clean up temporary directory
   */
  async cleanup(tempDir: string): Promise<void> {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      console.log(`Cleaned up temporary directory: ${tempDir}`);
    } catch (error) {
      console.error(`Failed to clean up ${tempDir}:`, error);
    }
  }
}
