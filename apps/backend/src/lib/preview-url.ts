/**
 * Sandbox Preview URL Generation
 *
 * Generates public URLs for accessing sandboxed preview environments.
 * - Development: Uses port-based routing (localhost:30000+)
 * - Production: Uses subdomain-based routing (preview-{id}.domain)
 */

/**
 * Generate public preview URL for sandbox
 * Uses subdomain routing in production, port-based in development
 *
 * @param sandboxId - URL-safe sandbox identifier (alphanumeric + hyphens)
 * @returns Public URL to access the sandbox preview
 */
export function generateSandboxPreviewUrl(sandboxId: string): string {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    // Development: Use port-based routing
    // sandboxId format: url-safe (alphanumeric + hyphens)
    const portOffset = hashSandboxId(sandboxId) % 10000;
    const port = 30000 + portOffset;
    return `http://localhost:${port}`;
  } else {
    // Production: Use subdomain-based routing
    // Requires wildcard DNS: *.vusercontent.net → backend IP
    const previewDomain = process.env.PREVIEW_DOMAIN || 'vusercontent.net';
    return `https://preview-${sandboxId}.${previewDomain}`;
  }
}

/**
 * Hash sandboxId to generate deterministic port offset
 * Ensures same sandboxId always maps to same port
 *
 * @param sandboxId - Sandbox identifier
 * @returns Hash value (0-9999)
 */
function hashSandboxId(sandboxId: string): number {
  let hash = 0;
  for (let i = 0; i < sandboxId.length; i++) {
    hash += sandboxId.charCodeAt(i);
  }
  return hash % 10000;
}

/**
 * Validate sandboxId is URL-safe
 * Allows: alphanumeric (a-z, A-Z, 0-9), hyphens (-)
 * Blocks: underscores, slashes, dots, special chars
 *
 * @param sandboxId - ID to validate
 * @returns true if valid URL-safe format
 */
export function isValidSandboxId(sandboxId: string): boolean {
  return /^[a-zA-Z0-9-]+$/.test(sandboxId) && sandboxId.length > 0;
}

/**
 * Generate a URL-safe sandbox ID
 * Converts cuid or UUID to URL-safe format (removes special chars)
 *
 * @param baseId - Original ID (e.g., cuid from database)
 * @returns URL-safe sandbox ID
 */
export function generateUrlSafeSandboxId(baseId: string): string {
  // Convert base ID to URL-safe by removing invalid chars and replacing with hyphens
  return baseId
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-') // Replace non-alphanumeric chars with hyphen
    .replace(/-+/g, '-') // Collapse multiple hyphens to single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}
