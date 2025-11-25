#!/usr/bin/env tsx
/**
 * Cleanup script to delete all InstaBuild GitHub repositories
 *
 * WARNING: This will permanently delete repositories from your GitHub account!
 * Use with caution, intended for test accounts only.
 *
 * Usage:
 *   tsx scripts/cleanup-github-repos.ts
 *
 * The script will read GITHUB_TOKEN from apps/backend/.env
 * Or you can override with: GITHUB_TOKEN=your_token tsx scripts/cleanup-github-repos.ts
 */

import { Octokit } from '@octokit/rest';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

// Load .env file if it exists
function loadEnvFile() {
  const envPath = path.join(__dirname, '../apps/backend/.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
      }
    });
  }
}

// Load .env before getting token
loadEnvFile();

// Configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_PREFIX = ''; // Only delete repos starting with this prefix
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_CONFIRM =
  process.argv.includes('--yes') || process.argv.includes('-y');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function askConfirmation(question: string): Promise<boolean> {
  if (SKIP_CONFIRM) {
    return true;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(
      `${colors.yellow}${question} (yes/no): ${colors.reset}`,
      answer => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
      }
    );
  });
}

async function main() {
  // Validate GitHub token
  if (!GITHUB_TOKEN) {
    log('❌ Error: GITHUB_TOKEN environment variable is required', 'red');
    log(
      'Usage: GITHUB_TOKEN=your_token tsx scripts/cleanup-github-repos.ts',
      'cyan'
    );
    process.exit(1);
  }

  log('🔍 Initializing GitHub cleanup script...', 'cyan');

  if (DRY_RUN) {
    log('🔍 DRY RUN MODE - No repositories will be deleted', 'yellow');
  }

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  try {
    // Get authenticated user
    log('\n📋 Fetching user information...', 'blue');
    const { data: user } = await octokit.users.getAuthenticated();
    log(`✅ Authenticated as: ${user.login}`, 'green');

    // List all repositories
    log('\n📋 Fetching repositories...', 'blue');
    const { data: allRepos } = await octokit.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'created',
      direction: 'desc',
    });

    // Filter for InstaBuild repos
    const instaBuildRepos = allRepos.filter(repo =>
      repo.name.toLowerCase().startsWith(REPO_PREFIX)
    );

    if (instaBuildRepos.length === 0) {
      log(
        '\n✅ No InstaBuild repositories found. Nothing to clean up!',
        'green'
      );
      return;
    }

    // Display repositories
    log(
      `\n📦 Found ${instaBuildRepos.length} InstaBuild repositories:`,
      'cyan'
    );
    instaBuildRepos.forEach((repo, index) => {
      log(
        `  ${index + 1}. ${repo.name} (${repo.private ? 'private' : 'public'}) - ${repo.html_url}`,
        'yellow'
      );
    });

    // Confirm deletion
    if (!DRY_RUN) {
      log(
        '\n⚠️  WARNING: This will PERMANENTLY DELETE all listed repositories!',
        'red'
      );
      const confirmed = await askConfirmation(
        `Are you sure you want to delete ${instaBuildRepos.length} repositories?`
      );

      if (!confirmed) {
        log('\n❌ Deletion cancelled by user', 'yellow');
        return;
      }
    }

    // Delete repositories
    log('\n🗑️  Starting deletion process...', 'blue');
    let successCount = 0;
    let failCount = 0;

    for (const repo of instaBuildRepos) {
      try {
        if (DRY_RUN) {
          log(`  [DRY RUN] Would delete: ${repo.name}`, 'yellow');
          successCount++;
        } else {
          await octokit.repos.delete({
            owner: user.login,
            repo: repo.name,
          });
          log(`  ✅ Deleted: ${repo.name}`, 'green');
          successCount++;
        }
      } catch (error) {
        failCount++;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        log(`  ❌ Failed to delete ${repo.name}: ${errorMessage}`, 'red');
      }
    }

    // Summary
    log('\n📊 Cleanup Summary:', 'cyan');
    if (DRY_RUN) {
      log(`  • Would delete: ${successCount} repositories`, 'yellow');
    } else {
      log(`  • Successfully deleted: ${successCount} repositories`, 'green');
      if (failCount > 0) {
        log(`  • Failed to delete: ${failCount} repositories`, 'red');
      }
    }

    if (!DRY_RUN && successCount > 0) {
      log('\n✅ Cleanup completed successfully!', 'green');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`\n❌ Error: ${errorMessage}`, 'red');
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  log(`\n❌ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});
