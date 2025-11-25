import { Octokit } from '@octokit/rest';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Service for deploying to GitHub Pages
 * Handles repository creation and file uploads
 */
export class GitHubPagesService {
  /**
   * Deploy built files to GitHub Pages
   */
  async deployToGitHub(
    accessToken: string,
    repo: string, // Format: "owner/repo"
    branch: string,
    filesDir: string // Directory containing built files
  ): Promise<string> {
    const octokit = new Octokit({ auth: accessToken });

    try {
      // Parse repo owner and name
      const [owner, repoName] = repo.split('/');
      if (!owner || !repoName) {
        throw new Error('Invalid repository format. Expected "owner/repo"');
      }

      // Ensure repository exists
      await this.ensureRepository(octokit, owner, repoName);

      // Read all files from directory
      const files = await this.readDirectory(filesDir);

      if (files.size === 0) {
        throw new Error('No files found to deploy');
      }

      // Push files to GitHub
      await this.pushFiles(octokit, owner, repoName, branch, files);

      // Return GitHub Pages URL
      const pagesUrl = `https://${owner}.github.io/${repoName}`;
      return pagesUrl;
    } catch (error) {
      console.error('GitHub Pages deployment error:', error);
      throw new Error(
        `Failed to deploy to GitHub Pages: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Ensure repository exists, create if it doesn't
   */
  private async ensureRepository(
    octokit: Octokit,
    owner: string,
    repo: string
  ): Promise<void> {
    try {
      // Check if repo exists
      await octokit.repos.get({ owner, repo });
      console.log(`Repository ${owner}/${repo} exists`);
    } catch (error: unknown) {
      // Repo doesn't exist, create it
      if (
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        error.status === 404
      ) {
        console.log(`Creating repository ${owner}/${repo}`);
        const isPrivate = process.env.GITHUB_CREATE_PRIVATE_REPOS === 'true';
        await octokit.repos.createForAuthenticatedUser({
          name: repo,
          auto_init: true, // Create with README on main branch (deployment goes to gh-pages, no conflict)
          private: isPrivate, // Public repos work with free accounts, private requires GitHub Pro
        });

        // Wait a moment for GitHub to initialize the repository
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        throw error;
      }
    }
  }

  /**
   * Push files to GitHub repository
   * Uses the GitHub API to create/update files
   */
  private async pushFiles(
    octokit: Octokit,
    owner: string,
    repo: string,
    branch: string,
    files: Map<string, string>
  ): Promise<void> {
    try {
      // Get the current branch reference
      let ref: string;
      let baseTree: string | undefined;

      try {
        const { data: branchData } = await octokit.git.getRef({
          owner,
          repo,
          ref: `heads/${branch}`,
        });
        ref = branchData.object.sha;

        // Get the tree of the latest commit
        const { data: commit } = await octokit.git.getCommit({
          owner,
          repo,
          commit_sha: ref,
        });
        baseTree = commit.tree.sha;
      } catch (error: unknown) {
        // Branch doesn't exist, create it from default branch
        console.log(
          `Branch ${branch} doesn't exist, creating from default branch`
        );

        // Get default branch
        const { data: repoData } = await octokit.repos.get({ owner, repo });
        const defaultBranch = repoData.default_branch;

        const { data: defaultRef } = await octokit.git.getRef({
          owner,
          repo,
          ref: `heads/${defaultBranch}`,
        });

        // Create new branch
        await octokit.git.createRef({
          owner,
          repo,
          ref: `refs/heads/${branch}`,
          sha: defaultRef.object.sha,
        });

        ref = defaultRef.object.sha;

        const { data: commit } = await octokit.git.getCommit({
          owner,
          repo,
          commit_sha: ref,
        });
        baseTree = commit.tree.sha;
      }

      // Create blobs for all files
      const blobs = await Promise.all(
        Array.from(files.entries()).map(async ([filePath, content]) => {
          const { data: blob } = await octokit.git.createBlob({
            owner,
            repo,
            content: Buffer.from(content).toString('base64'),
            encoding: 'base64',
          });

          return {
            path: filePath,
            mode: '100644' as const,
            type: 'blob' as const,
            sha: blob.sha,
          };
        })
      );

      // Create a new tree with all files
      const { data: newTree } = await octokit.git.createTree({
        owner,
        repo,
        tree: blobs,
        base_tree: baseTree,
      });

      // Create a new commit
      const { data: newCommit } = await octokit.git.createCommit({
        owner,
        repo,
        message: `Deploy to GitHub Pages - ${new Date().toISOString()}`,
        tree: newTree.sha,
        parents: [ref],
      });

      // Update the branch reference
      await octokit.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: newCommit.sha,
      });

      // Enable GitHub Pages if not already enabled
      try {
        await octokit.repos.createPagesSite({
          owner,
          repo,
          source: {
            branch,
            path: '/',
          },
        });
      } catch (error: unknown) {
        // Pages might already be enabled, check the error
        if (
          typeof error === 'object' &&
          error !== null &&
          'status' in error &&
          error.status === 409
        ) {
          console.log('GitHub Pages already enabled');
        } else {
          console.warn('Could not enable GitHub Pages:', error);
        }
      }

      console.log(
        `Successfully pushed ${files.size} files to ${owner}/${repo}:${branch}`
      );
    } catch (error) {
      console.error('Error pushing files to GitHub:', error);
      throw error;
    }
  }

  /**
   * Recursively read all files from a directory
   */
  private async readDirectory(
    dir: string,
    basePath: string = ''
  ): Promise<Map<string, string>> {
    const files = new Map<string, string>();

    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name);

      // Skip node_modules, .git, etc.
      if (this.shouldIgnore(entry.name)) {
        continue;
      }

      if (entry.isDirectory()) {
        // Recursively read subdirectories
        const subFiles = await this.readDirectory(fullPath, relativePath);
        for (const [filePath, content] of subFiles.entries()) {
          files.set(filePath, content);
        }
      } else if (entry.isFile()) {
        // Read file content
        const content = await fs.readFile(fullPath, 'utf-8');
        files.set(relativePath, content);
      }
    }

    return files;
  }

  /**
   * Check if a file/directory should be ignored
   */
  private shouldIgnore(name: string): boolean {
    const ignoreList = [
      'node_modules',
      '.git',
      '.env',
      '.env.local',
      '.DS_Store',
      'Thumbs.db',
    ];

    return ignoreList.includes(name) || name.startsWith('.');
  }
}
