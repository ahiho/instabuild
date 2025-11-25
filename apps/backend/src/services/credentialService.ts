/**
 * Credential Service
 *
 * Provides secure credential injection for sandbox containers.
 * Used by git credential helper to obtain GitHub authentication tokens.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../lib/logger.js';
import { requireEnv } from '../config/env.js';

export class CredentialService {
  private readonly githubToken: string;

  constructor() {
    this.githubToken = requireEnv('GITHUB_TOKEN');
  }

  /**
   * Handle git credential requests from sandboxes
   *
   * Security: Validates that request comes from legitimate sandbox
   * by checking SANDBOX_ID and USER_ID headers
   */
  async handleGitHubCredentialRequest(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const sandboxId = request.headers['x-sandbox-id'] as string;
    const userId = request.headers['x-user-id'] as string;

    // Validate request is from a sandbox
    if (!sandboxId || !userId) {
      logger.warn('Credential request missing required headers', {
        hasSandboxId: !!sandboxId,
        hasUserId: !!userId,
        ip: request.ip,
      });
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }

    // Log credential access for audit trail
    logger.info('GitHub credential requested by sandbox', {
      sandboxId,
      userId,
      timestamp: new Date().toISOString(),
    });

    // Return GitHub token
    // Git credential helper expects the token as both username and password
    reply.code(200).send(this.githubToken);
  }
}

// Singleton instance
let credentialServiceInstance: CredentialService | null = null;

export function getCredentialService(): CredentialService {
  if (!credentialServiceInstance) {
    credentialServiceInstance = new CredentialService();
  }
  return credentialServiceInstance;
}
