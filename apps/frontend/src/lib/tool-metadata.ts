/**
 * Frontend Tool Metadata Registry
 *
 * Provides human-readable descriptions and metadata for tools displayed in the chat panel.
 * This helps users understand what tools are being called and what they do.
 */

export interface ToolMetadata {
  displayName: string;
  description: string; // User-friendly description of what the tool does
  icon?: string;
  category?: string;
}

/**
 * Comprehensive tool metadata registry
 * Maps tool names to user-friendly descriptions
 *
 * Tool names come from:
 * 1. The tool name from the backend tool definitions (snake_case)
 * 2. The Vercel AI SDK dynamic type (tool-{name})
 */
export const TOOL_METADATA: Record<string, ToolMetadata> = {
  // File System Tools
  glob: {
    displayName: '🔍 Find Files',
    description: 'Searching for files matching a pattern',
    category: 'File System',
  },
  list_directory: {
    displayName: '📁 List Directory',
    description: 'Exploring and listing files and folders in a directory',
    category: 'File System',
  },
  read_file: {
    displayName: '📄 Read File',
    description: 'Reading contents of a file',
    category: 'File System',
  },
  read: {
    displayName: '📄 Read File',
    description: 'Reading contents of a file',
    category: 'File System',
  },
  write_file: {
    displayName: '✍️ Write File',
    description: 'Creating or updating file contents',
    category: 'File System',
  },
  write: {
    displayName: '✍️ Write File',
    description: 'Creating or updating file contents',
    category: 'File System',
  },
  edit_file: {
    displayName: '✏️ Edit File',
    description: 'Modifying specific parts of a file',
    category: 'File System',
  },
  edit: {
    displayName: '✏️ Edit File',
    description: 'Modifying specific parts of a file',
    category: 'File System',
  },
  delete_file: {
    displayName: '🗑️ Delete File',
    description: 'Removing a file',
    category: 'File System',
  },
  delete: {
    displayName: '🗑️ Delete File',
    description: 'Removing a file',
    category: 'File System',
  },
  create_directory: {
    displayName: '📁 Create Directory',
    description: 'Creating a new folder',
    category: 'File System',
  },

  // Landing Page Tools
  update_landing_page_content: {
    displayName: '📝 Update Page Content',
    description: 'Modifying text, headlines, or copy on your landing page',
    category: 'Landing Page',
  },
  update_page_elements: {
    displayName: '🎨 Update Page Elements',
    description: 'Changing visual elements, colors, or styling',
    category: 'Landing Page',
  },
  add_section: {
    displayName: '➕ Add Section',
    description: 'Adding a new section to your landing page',
    category: 'Landing Page',
  },
  remove_section: {
    displayName: '➖ Remove Section',
    description: 'Deleting a section from your landing page',
    category: 'Landing Page',
  },
  update_hero: {
    displayName: '⭐ Update Hero Section',
    description: 'Customizing the main hero/header section',
    category: 'Landing Page',
  },

  // Asset Management Tools
  upload_asset: {
    displayName: '⬆️ Upload Asset',
    description: 'Uploading images or files to your project',
    category: 'Asset Management',
  },
  delete_asset: {
    displayName: '🗑️ Delete Asset',
    description: 'Removing an uploaded asset or image',
    category: 'Asset Management',
  },
  list_assets: {
    displayName: '📦 List Assets',
    description: 'Viewing all uploaded assets and images',
    category: 'Asset Management',
  },

  // Validation Tools
  validate_html: {
    displayName: '✓ Validate HTML',
    description: 'Checking HTML code for errors',
    category: 'Validation',
  },
  validate_css: {
    displayName: '✓ Validate CSS',
    description: 'Checking CSS styling for errors',
    category: 'Validation',
  },
  validate_content: {
    displayName: '✓ Validate Content',
    description: 'Checking content for quality and completeness',
    category: 'Validation',
  },

  // Utility Tools
  summarize: {
    displayName: '📋 Summarize',
    description: 'Creating a concise summary of content',
    category: 'Utility',
  },
  generate_text: {
    displayName: '✨ Generate Text',
    description: 'Creating new text or copy',
    category: 'Utility',
  },

  // Additional Tools (Backend Registered)
  replace: {
    displayName: '↔️ Replace Text',
    description: 'Replacing text in a file',
    category: 'File System',
  },
  search_file_content: {
    displayName: '🔎 Search in Files',
    description: 'Searching for text patterns in files or directories',
    category: 'File System',
  },
  fix_code: {
    displayName: '🐛 Fix Code',
    description: 'Fixing code issues and errors',
    category: 'Validation',
  },
  validate_code: {
    displayName: '✓ Validate Code',
    description: 'Checking code for errors and issues',
    category: 'Validation',
  },
};

/**
 * Get metadata for a specific tool
 * @param toolName - The name of the tool
 * @returns Tool metadata or a default entry if not found
 */
export function getToolMetadata(toolName: string): ToolMetadata {
  return (
    TOOL_METADATA[toolName] || {
      displayName: formatToolName(toolName),
      description: `Executing ${formatToolName(toolName)} tool`,
      category: 'Unknown',
    }
  );
}

/**
 * Format a tool name into a readable display name
 * Converts snake_case to Title Case
 * @param toolName - The tool name to format
 * @returns Formatted display name
 */
export function formatToolName(toolName: string): string {
  return toolName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get all tools grouped by category
 * @returns Object with tools grouped by category
 */
export function getToolsByCategory(): Record<string, ToolMetadata[]> {
  const grouped: Record<string, ToolMetadata[]> = {};

  Object.entries(TOOL_METADATA).forEach(([name, metadata]) => {
    const category = metadata.category || 'Other';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push({ ...metadata, displayName: name });
  });

  return grouped;
}
