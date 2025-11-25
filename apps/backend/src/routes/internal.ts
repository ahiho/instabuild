/**
 * Internal API Routes
 *
 * These endpoints are for internal service-to-service communication only.
 * NOT exposed to public API - used by Docker sandboxes and internal services.
 */

import { FastifyInstance } from 'fastify';
import { getCredentialService } from '../services/credentialService.js';

export async function internalRoutes(fastify: FastifyInstance) {
  const credentialService = getCredentialService();

  /**
   * GET /api/v1/internal/credentials/github
   *
   * Provides GitHub access token to authenticated sandboxes.
   * Used by git credential helper inside Docker containers.
   *
   * Security:
   * - Validates X-Sandbox-ID and X-User-ID headers
   * - Logs all credential access for audit
   * - Only accessible from Docker network (not public)
   */
  fastify.get('/internal/credentials/github', async (request, reply) => {
    await credentialService.handleGitHubCredentialRequest(request, reply);
  });
}
