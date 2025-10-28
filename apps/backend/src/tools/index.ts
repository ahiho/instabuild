/**
 * Central tool registration module
 * Registers all available tools for the agentic system
 */

import { logger } from '../lib/logger.js';
import { registerAssetManagementTools } from './asset-management-tools.js';
import { registerFilesystemTools } from './filesystem-tools.js';
import { registerTextTools } from './text-tools-minimal.js';
import { registerValidationTools } from './validation-tools.js';

/**
 * Register all available tools
 */
export function registerAllTools() {
  try {
    console.log('🔧 REGISTER ALL TOOLS CALLED');
    logger.info('Registering all tools...');

    console.log('🔧 CALLING registerTextTools()');
    registerTextTools();
    console.log('🔧 registerTextTools() completed');

    registerFilesystemTools();
    registerValidationTools();
    registerAssetManagementTools();

    logger.info('All tools registered successfully');
  } catch (error) {
    console.error('🔧 REGISTER ALL TOOLS ERROR:', error);
    logger.error('Failed to register tools', { error });
    throw error;
  }
}
