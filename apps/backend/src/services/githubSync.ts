import { Octokit } from '@octokit/rest';
import { exec } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { prisma } from '../server.js';
import { logger } from '../lib/logger.js';

const execAsync = promisify(exec);

/**
 * Service for synchronizing landing page code with GitHub
 *
 * Responsibilities:
 * - Auto-commit code changes to GitHub after file operations
 * - Manage GitHub repositories per landing page
 * - Handle git operations (clone, checkout, push, etc.)
 * - Restore code from GitHub to containers
 */
export class GitHubSyncService {
  private octokit: Octokit;
  private gitHubToken: string;
  private localReposDir: string; // Local directory to store cloned repos

  constructor() {
    this.gitHubToken = process.env.GITHUB_TOKEN || '';
    this.octokit = new Octokit({ auth: this.gitHubToken });
    this.localReposDir =
      process.env.GITHUB_REPOS_DIR || '/tmp/instabuild-github-repos';

    // Create local repos directory if it doesn't exist
    if (!fs.existsSync(this.localReposDir)) {
      fs.mkdirSync(this.localReposDir, { recursive: true });
    }

    logger.info('GitHubSyncService initialized', {
      reposDir: this.localReposDir,
      hasToken: !!this.gitHubToken,
    });
  }

  /**
   * Auto-commit code changes to GitHub (DEPRECATED - use syncProjectToGitHub)
   * Called after file write/replace operations
   *
   * @deprecated Use syncProjectToGitHub for project-level sync
   * @param landingPageId - The landing page being modified
   * @param userId - User making the change
   * @param filePath - The file that was modified (relative path)
   * @param content - The new file content
   */
  async autoCommit(
    landingPageId: string,
    _userId: string, // Not used currently but kept for future audit logging
    filePath: string,
    content: string
  ): Promise<void> {
    // Validate content is not null/undefined before processing
    if (content === null || content === undefined) {
      logger.warn('autoCommit called with null/undefined content - skipping', {
        landingPageId,
        filePath,
        contentType: typeof content,
      });
      return;
    }

    logger.info('autoCommit method called (deprecated)', {
      landingPageId,
      filePath,
      contentLength: content.length,
      hasToken: !!this.gitHubToken,
    });

    try {
      const landingPage = await prisma.landingPage.findUnique({
        where: { id: landingPageId },
        select: { id: true, title: true, githubRepoUrl: true, projectId: true },
      });

      if (!landingPage) {
        logger.warn('Landing page not found for auto-commit', {
          landingPageId,
        });
        return;
      }

      // Ensure GitHub repo exists
      if (!landingPage.githubRepoUrl) {
        logger.info('Creating GitHub repository for landing page', {
          landingPageId,
          projectId: landingPage.projectId,
          title: landingPage.title,
        });
        const repoUrl = await this.ensureGitHubRepo(landingPage);
        logger.info('GitHub repository created successfully', {
          landingPageId,
          repoUrl,
        });
        await prisma.landingPage.update({
          where: { id: landingPageId },
          data: { githubRepoUrl: repoUrl },
        });
      } else {
        logger.info('Using existing GitHub repository', {
          landingPageId,
          repoUrl: landingPage.githubRepoUrl,
        });
      }

      // Get or clone local repo
      const localRepoPath = await this.ensureLocalRepo(
        landingPage.githubRepoUrl!
      );

      // Write file to local repo
      const fullPath = path.join(localRepoPath, filePath);
      const dirPath = path.dirname(fullPath);

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      fs.writeFileSync(fullPath, content, 'utf-8');

      // Commit and push
      const timestamp = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const fileName = path.basename(filePath);
      const commitMessage = `Updated ${fileName} - ${timestamp}`;
      await this.commitAndPush(localRepoPath, filePath, commitMessage);

      // Get latest commit SHA and update database
      const latestCommitSha = await this.getLatestCommitSha(localRepoPath);
      await prisma.landingPage.update({
        where: { id: landingPageId },
        data: { commitSha: latestCommitSha },
      });

      logger.info('Auto-committed changes to GitHub', {
        landingPageId,
        filePath,
        commitSha: latestCommitSha,
      });
    } catch (error) {
      logger.error('Failed to auto-commit changes', {
        landingPageId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - auto-commit failures shouldn't block user work
    }
  }

  /**
   * Sync entire project workspace to GitHub using sandbox git CLI
   * Creates repository if needed, executes git commands directly in sandbox
   *
   * @param projectId - The project to sync
   * @param conversationId - The conversation context (for commit message)
   * @param sandboxId - The Docker container ID
   */
  async syncProjectToGitHub(
    projectId: string,
    conversationId: string,
    sandboxId: string
  ): Promise<void> {
    logger.info('syncProjectToGitHub called', {
      projectId,
      conversationId,
      sandboxId,
      hasToken: !!this.gitHubToken,
    });

    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          name: true,
          userId: true,
          githubRepoUrl: true,
          sandboxId: true,
        },
      });

      if (!project) {
        logger.warn('Project not found for GitHub sync', { projectId });
        return;
      }

      // Ensure GitHub repo exists for project
      let repoUrl = project.githubRepoUrl;
      if (!repoUrl) {
        logger.info('Creating GitHub repository for project', {
          projectId,
          projectName: project.name,
        });
        repoUrl = await this.ensureGitHubRepoForProject(project);
        await prisma.project.update({
          where: { id: projectId },
          data: { githubRepoUrl: repoUrl },
        });
        logger.info('GitHub repository created successfully', {
          projectId,
          repoUrl,
        });
      }

      // Get conversation title for commit message
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { title: true },
      });

      const timestamp = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const conversationTitle = conversation?.title || 'Untitled conversation';
      const commitMessage = `AI: ${conversationTitle} - ${timestamp}`;

      // Execute git commands in sandbox
      await this.syncViaSandboxGit(sandboxId, repoUrl, commitMessage);

      // Get latest commit SHA from sandbox and update database
      const latestCommitSha = await this.getCommitShaFromSandbox(sandboxId);
      if (latestCommitSha) {
        await prisma.project.update({
          where: { id: projectId },
          data: { commitSha: latestCommitSha },
        });
      }

      logger.info('Successfully synced project to GitHub', {
        projectId,
        conversationId,
        commitSha: latestCommitSha,
      });
    } catch (error) {
      logger.error('Failed to sync project to GitHub', {
        projectId,
        conversationId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - GitHub sync failures shouldn't block user work
    }
  }

  /**
   * Restore code from GitHub to a container workspace
   *
   * @param landingPageId - The landing page to restore
   * @param workspacePath - The container's workspace directory
   * @param versionTag - Optional specific version tag to restore (e.g., 'v2'). If not provided, uses latest commit
   */
  async restoreToWorkspace(
    landingPageId: string,
    workspacePath: string,
    versionTag?: string
  ): Promise<void> {
    try {
      const landingPage = await prisma.landingPage.findUnique({
        where: { id: landingPageId },
        select: { githubRepoUrl: true, title: true },
      });

      if (!landingPage || !landingPage.githubRepoUrl) {
        logger.warn('Landing page or GitHub repo not found for restore', {
          landingPageId,
        });
        return;
      }

      // Get or clone local repo
      const localRepoPath = await this.ensureLocalRepo(
        landingPage.githubRepoUrl
      );

      // Checkout specific version or latest
      if (versionTag) {
        await this.checkoutTag(localRepoPath, versionTag);
      } else {
        // Pull latest commits
        await execAsync('git pull', { cwd: localRepoPath });
      }

      // Copy files from repo to workspace
      await this.copyRepoToWorkspace(localRepoPath, workspacePath);

      logger.info('Restored code from GitHub to workspace', {
        landingPageId,
        versionTag: versionTag || 'latest',
        workspacePath,
      });
    } catch (error) {
      logger.error('Failed to restore code from GitHub', {
        landingPageId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - restoration failures shouldn't prevent container startup
    }
  }

  /**
   * Restore project code from GitHub to a container workspace
   * Project-level restore using project.githubRepoUrl
   * Clones directly inside the container using git commands
   *
   * @param projectId - The project to restore
   * @param containerId - The Docker container ID
   * @param conversationId - For logging context
   */
  async restoreProjectToWorkspace(
    projectId: string,
    containerId: string,
    conversationId: string
  ): Promise<void> {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { githubRepoUrl: true, name: true },
      });

      if (!project || !project.githubRepoUrl) {
        logger.warn('Project or GitHub repo not found for restore', {
          projectId,
        });
        return;
      }

      logger.info('Starting project restore from GitHub', {
        projectId,
        conversationId,
        repoUrl: project.githubRepoUrl,
      });

      // Import Docker
      const Docker = (await import('dockerode')).default;
      const docker = new Docker({ socketPath: '/var/run/docker.sock' });
      const container = docker.getContainer(containerId);

      // Helper to execute command in container
      const execCommand = async (command: string): Promise<string> => {
        const exec = await container.exec({
          Cmd: ['sh', '-c', `cd /workspace && ${command}`],
          AttachStdout: true,
          AttachStderr: true,
        });

        const stream = await exec.start({ Detach: false });

        return new Promise((resolve, reject) => {
          let stdout = '';
          let stderr = '';

          stream.on('data', (chunk: Buffer) => {
            const text = chunk.toString();
            if (text.length > 8) {
              const cleaned = text.slice(8);
              if (chunk[0] === 1) stdout += cleaned;
              else if (chunk[0] === 2) stderr += cleaned;
            }
          });

          stream.on('end', () => {
            if (stderr && !stderr.includes('Already up to date')) {
              logger.debug('Git command stderr', {
                conversationId,
                stderr: stderr.trim(),
              });
            }
            resolve(stdout.trim());
          });

          stream.on('error', reject);
        });
      };

      // Add GitHub token to repo URL for authentication
      const authUrl = project.githubRepoUrl.replace(
        'https://',
        `https://${this.gitHubToken}@`
      );

      // Clone repo to a temp directory inside container, then move files
      await execCommand('rm -rf .git-temp');
      await execCommand(`git clone ${authUrl} .git-temp`);

      // Move all files from .git-temp to current directory
      await execCommand('cp -r .git-temp/. .');
      await execCommand('rm -rf .git-temp');

      logger.info('Restored project code from GitHub to workspace', {
        projectId,
        conversationId,
        repoUrl: project.githubRepoUrl,
      });
    } catch (error) {
      logger.error('Failed to restore project code from GitHub', {
        projectId,
        conversationId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - restoration failures shouldn't prevent container startup
    }
  }

  /**
   * Create a new version (tag) for the current commit
   *
   * @param landingPageId - The landing page
   * @param versionNumber - The version number (e.g., 1, 2, 3)
   */
  async createVersion(
    landingPageId: string,
    versionNumber: number
  ): Promise<string> {
    try {
      const landingPage = await prisma.landingPage.findUnique({
        where: { id: landingPageId },
        select: { githubRepoUrl: true },
      });

      if (!landingPage || !landingPage.githubRepoUrl) {
        throw new Error('Landing page or GitHub repo not found');
      }

      const localRepoPath = await this.ensureLocalRepo(
        landingPage.githubRepoUrl
      );

      // Create version tag
      const versionTag = `v${versionNumber}`;
      await execAsync(`git tag ${versionTag}`, { cwd: localRepoPath });
      await execAsync('git push origin --tags', { cwd: localRepoPath });

      logger.info('Created version tag', {
        landingPageId,
        versionTag,
      });

      return versionTag;
    } catch (error) {
      logger.error('Failed to create version', {
        landingPageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * List all version tags for a landing page
   */
  async listVersions(landingPageId: string): Promise<string[]> {
    try {
      const landingPage = await prisma.landingPage.findUnique({
        where: { id: landingPageId },
        select: { githubRepoUrl: true },
      });

      if (!landingPage || !landingPage.githubRepoUrl) {
        return [];
      }

      const localRepoPath = await this.ensureLocalRepo(
        landingPage.githubRepoUrl
      );

      // Get all tags matching v* pattern
      const { stdout } = await execAsync(
        'git tag -l "v*" --sort=-version:refname',
        {
          cwd: localRepoPath,
        }
      );

      const tags = stdout
        .trim()
        .split('\n')
        .filter(tag => tag.length > 0);

      return tags;
    } catch (error) {
      logger.error('Failed to list versions', {
        landingPageId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Private helper methods
   */

  /**
   * Ensure GitHub repository exists for a project
   */
  private async ensureGitHubRepoForProject(project: {
    id: string;
    name: string;
    userId: string;
  }): Promise<string> {
    try {
      // Use GitHub token to get username
      const { data: user } = await this.octokit.users.getAuthenticated();
      const owner = user.login;

      // Create private repo (1 project = 1 repository)
      // auto_init: false to avoid initial README commit that conflicts with sandbox code
      const repoName = `instabuild-${project.id}`.toLowerCase();

      const { data: repo } =
        await this.octokit.repos.createForAuthenticatedUser({
          name: repoName,
          description: `InstaBuild project: ${project.name}`,
          private: true,
          auto_init: false, // Don't create initial commit - sandbox will provide first commit
        });

      logger.info('Created GitHub repository for project', {
        projectId: project.id,
        owner,
        repoName,
        url: repo.html_url,
      });

      return repo.clone_url;
    } catch (error: any) {
      // Repo might already exist
      if (error.status === 422) {
        logger.info('Repository already exists', { error: error.message });
        // Return expected clone URL format
        const repoName = `instabuild-${project.id}`.toLowerCase();
        const { data: user } = await this.octokit.users.getAuthenticated();
        const owner = user.login;
        return `https://github.com/${owner}/${repoName}.git`;
      }
      throw error;
    }
  }

  private async ensureGitHubRepo(landingPage: {
    id: string;
    title: string;
    projectId: string;
  }): Promise<string> {
    try {
      // Use GitHub token to get username
      const { data: user } = await this.octokit.users.getAuthenticated();
      const owner = user.login;

      // Create private repo
      const repoName =
        `instabuild-${landingPage.projectId}-${landingPage.id}`.toLowerCase();

      const { data: repo } =
        await this.octokit.repos.createForAuthenticatedUser({
          name: repoName,
          description: `InstaBuild landing page: ${landingPage.title}`,
          private: true,
          auto_init: true,
        });

      logger.info('Created GitHub repository', {
        owner,
        repoName,
        url: repo.html_url,
      });

      return repo.clone_url;
    } catch (error: any) {
      // Repo might already exist
      if (error.status === 422) {
        logger.info('Repository already exists', { error: error.message });
        // Return expected clone URL format
        const repoName =
          `instabuild-${landingPage.projectId}-${landingPage.id}`.toLowerCase();
        const owner = process.env.GITHUB_USER || 'unknown';
        return `https://github.com/${owner}/${repoName}.git`;
      }
      throw error;
    }
  }

  private async ensureLocalRepo(repoUrl: string): Promise<string> {
    const repoHash = crypto.createHash('md5').update(repoUrl).digest('hex');
    const localPath = path.join(this.localReposDir, repoHash);

    if (!fs.existsSync(localPath)) {
      const authUrl = repoUrl.replace(
        'https://',
        `https://${this.gitHubToken}@`
      );

      try {
        // Try to clone - this works for repos with commits
        await execAsync(`git clone ${authUrl} ${localPath}`);
        logger.info('Cloned GitHub repository', { localPath });
      } catch (error) {
        // Clone failed - probably empty repo without initial commit
        // Initialize local repo and set remote
        logger.info('Clone failed, initializing empty repo locally', {
          localPath,
          error: error instanceof Error ? error.message : String(error),
        });

        fs.mkdirSync(localPath, { recursive: true });
        await execAsync('git init', { cwd: localPath });
        await execAsync('git checkout -b main', { cwd: localPath });
        await execAsync(`git remote add origin ${authUrl}`, {
          cwd: localPath,
        });

        // Configure git user
        await execAsync('git config user.name "InstaBuild AI"', {
          cwd: localPath,
        });
        await execAsync('git config user.email "ai@instabuild.dev"', {
          cwd: localPath,
        });

        logger.info('Initialized local repository for empty GitHub repo', {
          localPath,
        });
      }
    }

    return localPath;
  }

  private async commitAndPush(
    localRepoPath: string,
    filePath: string,
    message: string
  ): Promise<void> {
    // Configure git user (required for commits)
    await execAsync('git config user.name "InstaBuild AI"', {
      cwd: localRepoPath,
    });
    await execAsync('git config user.email "ai@instabuild.dev"', {
      cwd: localRepoPath,
    });

    // Stage file
    await execAsync(`git add "${filePath}"`, { cwd: localRepoPath });

    // Commit
    await execAsync(`git commit -m "${message}"`, { cwd: localRepoPath });

    // Push
    await execAsync('git push origin main', { cwd: localRepoPath });
  }

  private async getLatestCommitSha(localRepoPath: string): Promise<string> {
    const { stdout } = await execAsync('git rev-parse HEAD', {
      cwd: localRepoPath,
    });
    return stdout.trim();
  }

  private async checkoutTag(localRepoPath: string, tag: string): Promise<void> {
    await execAsync('git fetch origin', { cwd: localRepoPath });
    await execAsync(`git checkout tags/${tag}`, { cwd: localRepoPath });
  }

  private async copyRepoToWorkspace(
    repoPath: string,
    workspacePath: string
  ): Promise<void> {
    // Get list of files in repo (excluding .git)
    const { stdout } = await execAsync(
      'git ls-files -o --exclude-standard --cached',
      {
        cwd: repoPath,
      }
    );

    const files = stdout
      .trim()
      .split('\n')
      .filter(f => f.length > 0);

    // Create workspace directory if needed
    if (!fs.existsSync(workspacePath)) {
      fs.mkdirSync(workspacePath, { recursive: true });
    }

    // Copy each file
    for (const file of files) {
      const src = path.join(repoPath, file);
      const dest = path.join(workspacePath, file);
      const destDir = path.dirname(dest);

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      fs.copyFileSync(src, dest);
    }

    logger.info('Copied repository files to workspace', {
      workspacePath,
      fileCount: files.length,
    });
  }

  /**
   * Execute git commands directly in sandbox container
   * Handles remote setup, commit, and push operations
   */
  private async syncViaSandboxGit(
    sandboxId: string,
    repoUrl: string,
    commitMessage: string
  ): Promise<void> {
    const Docker = (await import('dockerode')).default;
    const docker = new Docker({ socketPath: '/var/run/docker.sock' });
    const container = docker.getContainer(sandboxId);

    // Helper to execute command in container
    const execCommand = async (
      command: string
    ): Promise<{ stdout: string; stderr: string }> => {
      const exec = await container.exec({
        Cmd: ['sh', '-c', `cd /workspace && ${command}`],
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await exec.start({ Detach: false });

      return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';

        stream.on('data', (chunk: Buffer) => {
          const text = chunk.toString();
          // Docker multiplexes stdout/stderr - strip control bytes
          if (text.length > 8) {
            const cleaned = text.slice(8);
            if (chunk[0] === 1) stdout += cleaned;
            else if (chunk[0] === 2) stderr += cleaned;
          }
        });

        stream.on('end', () =>
          resolve({ stdout: stdout.trim(), stderr: stderr.trim() })
        );
        stream.on('error', reject);
      });
    };

    try {
      // Check if remote is already configured
      const { stdout: remoteOutput } = await execCommand('git remote -v');

      if (!remoteOutput.includes('origin')) {
        // Add remote
        logger.info('Adding git remote to sandbox', { sandboxId, repoUrl });
        await execCommand(`git remote add origin ${repoUrl}`);
      } else if (!remoteOutput.includes(repoUrl)) {
        // Update remote URL if it changed
        logger.info('Updating git remote URL in sandbox', {
          sandboxId,
          repoUrl,
        });
        await execCommand(`git remote set-url origin ${repoUrl}`);
      }

      // Check for changes
      const { stdout: statusOutput } = await execCommand(
        'git status --porcelain'
      );

      if (!statusOutput.trim()) {
        logger.info('No changes to commit in sandbox', { sandboxId });
        return;
      }

      // Stage all changes
      logger.info('Staging changes in sandbox', { sandboxId });
      await execCommand('git add -A');

      // Commit
      logger.info('Committing changes in sandbox', {
        sandboxId,
        commitMessage,
      });
      // Escape commit message for shell
      const escapedMessage = commitMessage.replace(/"/g, '\\"');
      await execCommand(`git commit -m "${escapedMessage}"`);

      // Get current branch name (could be 'main' or 'master')
      const { stdout: branchName } = await execCommand(
        'git branch --show-current'
      );
      const currentBranch = branchName.trim();
      logger.info('Detected current branch', {
        sandboxId,
        branch: currentBranch,
      });

      // Push (first time needs upstream, subsequent pushes don't)
      logger.info('Pushing to GitHub from sandbox', {
        sandboxId,
        branch: currentBranch,
      });
      try {
        await execCommand(`git push origin ${currentBranch}`);
      } catch (pushError) {
        // If push fails, try with --set-upstream (first push)
        logger.info('Attempting first push with --set-upstream', {
          sandboxId,
          branch: currentBranch,
        });
        await execCommand(`git push --set-upstream origin ${currentBranch}`);
      }

      logger.info('Successfully synced sandbox to GitHub via git CLI', {
        sandboxId,
        repoUrl,
      });
    } catch (error) {
      logger.error('Failed to sync via sandbox git', {
        sandboxId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Revert project to a specific commit in the container
   * Uses git reset --hard to revert to the specified commit
   *
   * @param projectId - The project to revert
   * @param commitSha - The commit SHA to revert to
   * @param conversationId - For logging context
   * @returns Object with success status and message
   */
  async revertProjectToCommit(
    projectId: string,
    commitSha: string,
    conversationId: string
  ): Promise<{ success: boolean; message: string; hasConflicts: boolean }> {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { githubRepoUrl: true, sandboxId: true, name: true },
      });

      if (!project || !project.githubRepoUrl || !project.sandboxId) {
        return {
          success: false,
          message: 'Project, GitHub repo, or sandbox not found',
          hasConflicts: false,
        };
      }

      logger.info('Starting project revert to commit', {
        projectId,
        conversationId,
        commitSha,
      });

      const Docker = (await import('dockerode')).default;
      const docker = new Docker({ socketPath: '/var/run/docker.sock' });
      const container = docker.getContainer(project.sandboxId);

      // Helper to execute command in container
      const execCommand = async (command: string): Promise<string> => {
        const exec = await container.exec({
          Cmd: ['sh', '-c', `cd /workspace && ${command}`],
          AttachStdout: true,
          AttachStderr: true,
        });

        const stream = await exec.start({ Detach: false });

        return new Promise((resolve, reject) => {
          let stdout = '';
          let stderr = '';

          stream.on('data', (chunk: Buffer) => {
            const text = chunk.toString();
            if (text.length > 8) {
              const cleaned = text.slice(8);
              if (chunk[0] === 1) stdout += cleaned;
              else if (chunk[0] === 2) stderr += cleaned;
            }
          });

          stream.on('end', () => {
            if (stderr) {
              logger.debug('Git command stderr', {
                conversationId,
                stderr: stderr.trim(),
              });
            }
            resolve(stdout.trim());
          });

          stream.on('error', reject);
        });
      };

      // Fetch latest commits to ensure we have the commit
      await execCommand('git fetch origin');

      // Get current branch name before reset
      const branchName = await execCommand('git branch --show-current');
      const currentBranch = branchName.trim();

      // Reset to the specified commit (hard reset to discard all changes)
      // This automatically discards any uncommitted changes
      await execCommand(`git reset --hard ${commitSha}`);

      // Force push to update remote (rewriting history)
      logger.info('Force pushing to remote to persist revert', {
        projectId,
        conversationId,
        commitSha,
        branch: currentBranch,
      });
      await execCommand(`git push --force origin ${currentBranch}`);

      logger.info('Successfully reverted and pushed to remote', {
        projectId,
        conversationId,
        commitSha,
        branch: currentBranch,
      });

      return {
        success: true,
        message: `Successfully reverted to commit ${commitSha.substring(0, 7)}`,
        hasConflicts: false,
      };
    } catch (error) {
      logger.error('Failed to revert project to commit', {
        projectId,
        conversationId,
        commitSha,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to revert to commit',
        hasConflicts: false,
      };
    }
  }

  /**
   * Get git commit history for a project
   * Returns array of commits with SHA, message, author, and date
   */
  async getProjectCommitHistory(projectId: string): Promise<
    Array<{
      sha: string;
      message: string;
      author: string;
      date: string;
      timestamp: number;
    }>
  > {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { githubRepoUrl: true, sandboxId: true },
      });

      if (!project || !project.githubRepoUrl || !project.sandboxId) {
        logger.warn(
          'Project, GitHub repo, or sandbox not found for commit history',
          {
            projectId,
            hasRepo: !!project?.githubRepoUrl,
            hasSandbox: !!project?.sandboxId,
          }
        );
        return [];
      }

      const Docker = (await import('dockerode')).default;
      const docker = new Docker({ socketPath: '/var/run/docker.sock' });
      const container = docker.getContainer(project.sandboxId);

      // Execute git log command to get commit history
      const exec = await container.exec({
        Cmd: [
          'sh',
          '-c',
          'cd /workspace && git log --pretty=format:"%H|%s|%an|%ai" -n 50',
        ],
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await exec.start({ Detach: false });

      const output = await new Promise<string>((resolve, reject) => {
        let stdout = '';
        let stderr = '';

        stream.on('data', (chunk: Buffer) => {
          const text = chunk.toString();
          if (text.length > 8) {
            const cleaned = text.slice(8);
            if (chunk[0] === 1) stdout += cleaned;
            else if (chunk[0] === 2) stderr += cleaned;
          }
        });

        stream.on('end', () => {
          if (stderr && !stderr.includes('fatal')) {
            logger.debug('Git log stderr', {
              projectId,
              stderr: stderr.trim(),
            });
          }
          resolve(stdout.trim());
        });

        stream.on('error', reject);
      });

      if (!output) {
        return [];
      }

      // Parse git log output
      const commits = output.split('\n').map(line => {
        const [sha, message, author, date] = line.split('|');
        return {
          sha: sha?.trim() || '',
          message: message?.trim() || '',
          author: author?.trim() || '',
          date: date?.trim() || '',
          timestamp: new Date(date || '').getTime(),
        };
      });

      logger.info('Fetched project commit history', {
        projectId,
        commitCount: commits.length,
      });

      return commits.filter(c => c.sha); // Filter out any malformed entries
    } catch (error) {
      logger.error('Failed to get project commit history', {
        projectId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get the latest commit SHA from sandbox git repository
   */
  private async getCommitShaFromSandbox(
    sandboxId: string
  ): Promise<string | null> {
    try {
      const Docker = (await import('dockerode')).default;
      const docker = new Docker({ socketPath: '/var/run/docker.sock' });
      const container = docker.getContainer(sandboxId);

      const exec = await container.exec({
        Cmd: ['sh', '-c', 'cd /workspace && git rev-parse HEAD'],
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await exec.start({ Detach: false });

      return new Promise(resolve => {
        let stdout = '';

        stream.on('data', (chunk: Buffer) => {
          const text = chunk.toString();
          if (text.length > 8 && chunk[0] === 1) {
            stdout += text.slice(8);
          }
        });

        stream.on('end', () => {
          const sha = stdout.trim();
          resolve(sha || null);
        });

        stream.on('error', () => resolve(null));
      });
    } catch (error) {
      logger.warn('Failed to get commit SHA from sandbox', {
        sandboxId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}

let instance: GitHubSyncService | null = null;

export function initializeGitHubSyncService(): GitHubSyncService {
  if (!instance) {
    instance = new GitHubSyncService();
  }
  return instance;
}

export function getGitHubSyncService(): GitHubSyncService {
  if (!instance) {
    throw new Error(
      'GitHubSyncService not initialized. Call initializeGitHubSyncService first.'
    );
  }
  return instance;
}
