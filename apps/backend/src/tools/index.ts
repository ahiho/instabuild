/**
 * Central tool registration module
 * Registers all available tools for the agentic system
 */

import { logger } from '../lib/logger.js';
import { registerFilesystemTools } from './filesystem-tools.js';
import { registerValidationTools } from './validation-tools.js';
import { registerShellTool } from './shell-tool.js';
import { registerMemoryTools } from './memory-tools.js';
import { registerDevServerTool } from './dev-server-tool.js';
import { registerThinkingTools } from './thinking-tools.js';
import { registerAssetManagementTools } from './asset-management-tools.js';

/**
 * Register all available tools
 */
export function registerAllTools() {
  try {
    console.log('🔧 REGISTER ALL TOOLS CALLED');
    logger.info('Registering all tools...');

    registerFilesystemTools();
    registerValidationTools();
    registerShellTool();
    registerMemoryTools();
    registerDevServerTool();
    registerThinkingTools();
    registerAssetManagementTools();

    logger.info('All tools registered successfully');
  } catch (error) {
    console.error('🔧 REGISTER ALL TOOLS ERROR:', error);
    logger.error('Failed to register tools', { error });
    throw error;
  }
}
