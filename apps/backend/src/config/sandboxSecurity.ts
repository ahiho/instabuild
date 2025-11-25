/**
 * Centralized sandbox security configuration
 * Single source of truth for allowed commands and security rules
 */

/**
 * Commands allowed for execution in sandbox containers
 * This is the authoritative list used by all sandbox execution layers
 */
export const ALLOWED_SANDBOX_COMMANDS = new Set([
  // Package managers
  'npm',
  'npx', // npx - npm package runner (safe wrapper for node_modules/.bin)
  'pnpm',
  'yarn',
  'node',

  // Version control
  'git',

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
  'test',
  'stat',
  'tee',

  // Text processing and search
  'sed',
  'awk',
  'cut',
  'tr',
  'diff',
  'patch',
  'rg', // ripgrep - for fast file searching

  // Build and development tools
  'vite',
  'tsc',
  'eslint',
  'prettier',

  // Network tools
  'curl',
  'wget',

  // System info (safe)
  'pwd',
  'whoami',
  'id',
  'uname',
  'date',
  'echo',
  'sh', // Shell for running compound commands

  // Process management (limited)
  'ps',
  'kill',
  'killall',
]);

/**
 * Safe pnpm/npm/yarn subcommands
 */
export const SAFE_PACKAGE_SUBCOMMANDS = new Set([
  'install',
  'add',
  'remove',
  'rm',
  'run',
  'exec',
  'build',
  'dev',
  'start',
  'test',
  'lint',
  'format',
  'type-check',
  'publish',
  'list',
  'ls',
]);

/**
 * Dangerous flags that should be blocked
 */
export const DANGEROUS_FLAGS = new Set([
  '--global',
  '-g',
  '--unsafe-perm',
  '--registry',
  '--force',
  '--no-save',
  '--no-package-lock',
]);

/**
 * Allowed git subcommands
 */
export const ALLOWED_GIT_SUBCOMMANDS = new Set([
  'status',
  'add',
  'commit',
  'push',
  'pull',
  'clone',
  'init',
  'log',
  'show',
  'diff',
  'branch',
  'checkout',
  'merge',
  'rebase',
  'tag',
  'config',
]);

/**
 * Dangerous command patterns to block
 * These regex patterns are used to detect potentially harmful commands
 */
export const BLOCKED_COMMAND_PATTERNS = [
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
  // Note: rm validation is handled in SandboxShellRunner.validateCommand()
  // to allow rm within /workspace while blocking dangerous operations
];
