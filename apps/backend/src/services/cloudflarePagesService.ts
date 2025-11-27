import Cloudflare from 'cloudflare';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Service for deploying to Cloudflare Pages
 * Handles project creation and deployments via Wrangler CLI
 */
export class CloudflarePagesService {
  /**
   * Deploy built files to Cloudflare Pages
   */
  async deployToCloudflare(
    apiToken: string,
    projectName: string,
    branch: string,
    filesDir: string // Directory containing built files
  ): Promise<string> {
    try {
      const cloudflare = new Cloudflare({ apiToken });

      // Get account ID
      const accountId = await this.getAccountId(cloudflare);

      // Ensure project exists
      await this.ensureProject(cloudflare, accountId, projectName);

      // Verify directory exists and has files
      const files = await fs.readdir(filesDir);
      if (files.length === 0) {
        throw new Error('No files found to deploy');
      }

      // Deploy files to Cloudflare Pages using Wrangler CLI
      const deploymentUrl = await this.uploadFiles(
        cloudflare,
        accountId,
        projectName,
        branch,
        filesDir
      );

      return deploymentUrl;
    } catch (error) {
      console.error('Cloudflare Pages deployment error:', error);
      throw new Error(
        `Failed to deploy to Cloudflare Pages: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get the account ID for the authenticated user
   */
  private async getAccountId(cloudflare: Cloudflare): Promise<string> {
    try {
      const accounts = await cloudflare.accounts.list();

      if (!accounts.result || accounts.result.length === 0) {
        throw new Error('No Cloudflare accounts found');
      }

      // Use the first account
      return accounts.result[0].id;
    } catch (error) {
      console.error('Error getting Cloudflare account ID:', error);
      throw error;
    }
  }

  /**
   * Ensure Cloudflare Pages project exists, create if it doesn't
   */
  private async ensureProject(
    cloudflare: Cloudflare,
    accountId: string,
    projectName: string
  ): Promise<void> {
    try {
      // Check if project exists
      await cloudflare.pages.projects.get(projectName, {
        account_id: accountId,
      });
      console.log(`Cloudflare Pages project ${projectName} exists`);
    } catch (error: unknown) {
      // Project doesn't exist, create it
      if (
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        error.status === 404
      ) {
        console.log(`Creating Cloudflare Pages project ${projectName}`);
        try {
          await cloudflare.pages.projects.create({
            account_id: accountId,
            name: projectName,
            production_branch: 'main',
          });
          console.log(
            `Successfully created Cloudflare Pages project: ${projectName}`
          );
        } catch (createError) {
          console.error('Failed to create Cloudflare Pages project:', createError);
          throw new Error(
            `Failed to create project ${projectName}: ${createError instanceof Error ? createError.message : 'Unknown error'}`
          );
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Upload files to Cloudflare Pages using Wrangler CLI
   * Ensures multi-user isolation by passing environment variables per execution
   * Always deploys to production (main branch) to get production URL
   */
  private async uploadFiles(
    cloudflare: Cloudflare,
    accountId: string,
    projectName: string,
    _branch: string, // Ignored - always deploy to production
    filesDir: string
  ): Promise<string> {
    try {
      // Always deploy to production branch to get production URL instead of preview URL
      const productionBranch = 'main';

      console.log(`Deploying to Cloudflare Pages via Wrangler CLI...`);
      console.log(`  Project: ${projectName}`);
      console.log(`  Branch: ${productionBranch} (production)`);
      console.log(`  Directory: ${filesDir}`);

      // Get API token from cloudflare instance
      const apiToken = cloudflare.apiToken;
      if (!apiToken) {
        throw new Error('Cloudflare API token not available');
      }

      // Verify directory exists and has files
      const files = await fs.readdir(filesDir);
      console.log(`  Files in directory: ${files.length}`);

      if (files.length === 0) {
        throw new Error('No files found in deployment directory');
      }

      // Build wrangler command with explicit commit info to avoid auto-detection
      // Using npx ensures we always use latest wrangler without global install requirement
      const timestamp = new Date().toISOString();
      const commitHash = `deploy-${Date.now()}`; // Unique identifier for this deployment

      const command = `npx wrangler@latest pages deploy '${filesDir}' --project-name='${projectName}' --branch='${productionBranch}' --commit-message='Deployment at ${timestamp}' --commit-hash='${commitHash}' --commit-dirty=false`;

      console.log(`Executing: ${command}`);

      // Execute wrangler with isolated environment variables per deployment
      // This ensures multi-user support - each deployment gets its own token/account
      const { stdout, stderr } = await execAsync(command, {
        env: {
          ...process.env,
          CLOUDFLARE_API_TOKEN: apiToken,
          CLOUDFLARE_ACCOUNT_ID: accountId,
        },
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
        timeout: 600000, // 10 minute timeout
      });

      console.log('=== WRANGLER OUTPUT ===');
      console.log(stdout);
      if (stderr) {
        console.log('=== WRANGLER STDERR ===');
        console.log(stderr);
      }
      console.log('=======================');

      // Parse the deployment URL from wrangler output
      // Wrangler outputs: "✨ Deployment complete! Take a peek over at https://..."
      // Format: https://[deployment-id].[project-name].pages.dev or https://[project-name].pages.dev
      const urlMatch = stdout.match(/https:\/\/([a-zA-Z0-9-]+\.)?([a-zA-Z0-9-]+)\.pages\.dev/);

      if (!urlMatch) {
        console.error('Could not parse deployment URL from wrangler output');
        console.log('Stdout:', stdout);
        throw new Error('Failed to extract deployment URL from wrangler output');
      }

      // Extract the project name (group 2) and construct production URL
      const projectNameFromUrl = urlMatch[2]; // e.g., "lab-pro-3kq"
      const productionUrl = `https://${projectNameFromUrl}.pages.dev`;

      console.log('=== DEPLOYMENT COMPLETE ===');
      console.log(`Parsed from wrangler: ${urlMatch[0]}`);
      console.log(`Production URL: ${productionUrl}`);
      console.log('===========================');

      return productionUrl;
    } catch (error) {
      console.error('Error deploying to Cloudflare Pages via Wrangler:', error);
      // Log stderr if available for debugging
      if (error instanceof Error && 'stderr' in error) {
        console.error('Wrangler stderr:', (error as any).stderr);
      }
      throw new Error(
        `Failed to deploy to Cloudflare Pages: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

}