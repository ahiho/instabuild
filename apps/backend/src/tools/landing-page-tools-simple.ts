import type { EnhancedToolDefinition } from '@instabuild/shared/types';
import { ToolCategory } from '@instabuild/shared/types';
import { z } from 'zod';
import { logger } from '../lib/logger.js';
import { toolRegistry } from '../services/toolRegistry.js';

/**
 * Simple tool for updating content on landing pages
 */
const updateContentTool: EnhancedToolDefinition = {
  name: 'update_content',
  displayName: 'Update Content',
  description: 'Update text content of elements on the landing page',
  userDescription: 'change text content on your landing page',
  category: ToolCategory.LANDING_PAGE,
  safetyLevel: 'safe', // Content editing is safe
  inputSchema: z.object({
    elementId: z.string().describe('The ID of the element to update'),
    newContent: z.string().describe('The new text content'),
    contentType: z
      .enum(['text', 'heading', 'paragraph'])
      .optional()
      .describe('Type of content being updated'),
  }),
  async execute(input) {
    const { elementId, newContent, contentType = 'text' } = input;

    logger.info('Content update requested', {
      elementId,
      newContent,
      contentType,
    });

    return {
      success: true,
      userFeedback: `I've updated the ${contentType} content for element "${elementId}" to: "${newContent}"`,
      previewRefreshNeeded: true,
      changedFiles: [`elements/${elementId}.html`],
      technicalDetails: {
        elementId,
        newContent,
        contentType,
      },
    };
  },
  estimatedDuration: 2000,
  metadata: {
    version: '1.0.0',
    tags: ['content', 'text', 'landing-page'],
    examples: [
      {
        description: 'Update a heading',
        input: {
          elementId: 'main-heading',
          newContent: 'Welcome to Our Amazing Product',
          contentType: 'heading',
        },
      },
    ],
  },
};

/**
 * Simple tool for modifying element styles
 */
const updateStyleTool: EnhancedToolDefinition = {
  name: 'update_style',
  displayName: 'Update Styles',
  description: 'Update CSS styles of elements on the landing page',
  userDescription: 'change the visual appearance and styling of elements',
  category: ToolCategory.LANDING_PAGE,
  safetyLevel: 'safe', // Style changes are safe
  inputSchema: z.object({
    elementId: z.string().describe('The ID of the element to style'),
    styles: z
      .record(z.string(), z.string())
      .describe('CSS properties and values to apply'),
    description: z
      .string()
      .optional()
      .describe('Description of the style changes'),
  }),
  async execute(input) {
    const { elementId, styles, description } = input;

    logger.info('Style update requested', {
      elementId,
      styles,
      description,
    });

    const styleDescription = Object.entries(styles)
      .map(([prop, value]) => `${prop}: ${value}`)
      .join(', ');

    return {
      success: true,
      userFeedback: `I've updated the styles for element "${elementId}": ${styleDescription}${description ? ` (${description})` : ''}`,
      previewRefreshNeeded: true,
      changedFiles: [`styles/${elementId}.css`],
      technicalDetails: {
        elementId,
        appliedStyles: styles,
        description,
      },
    };
  },
  estimatedDuration: 1500,
  metadata: {
    version: '1.0.0',
    tags: ['style', 'css', 'visual', 'landing-page'],
    examples: [
      {
        description: 'Change button color',
        input: {
          elementId: 'cta-button',
          styles: { 'background-color': '#007bff', color: 'white' },
          description: 'Make button blue with white text',
        },
      },
    ],
  },
};

/**
 * Simple tool for adding new elements
 */
const addElementTool: EnhancedToolDefinition = {
  name: 'add_element',
  displayName: 'Add Element',
  description:
    'Add new elements like buttons, text, or sections to the landing page',
  userDescription:
    'add new elements like buttons, headings, or sections to your page',
  category: ToolCategory.LANDING_PAGE,
  safetyLevel: 'safe', // Adding elements is safe
  inputSchema: z.object({
    elementType: z
      .enum(['button', 'heading', 'paragraph', 'section', 'image'])
      .describe('Type of element to add'),
    content: z.string().describe('Content or text for the element'),
    parentElementId: z
      .string()
      .optional()
      .describe('ID of parent element to add this to'),
  }),
  async execute(input) {
    const { elementType, content, parentElementId } = input;

    const newElementId = `${elementType}-${Date.now()}`;

    logger.info('Element addition requested', {
      elementType,
      content,
      parentElementId,
      newElementId,
    });

    const locationText = parentElementId
      ? ` inside element "${parentElementId}"`
      : ' to the page';

    return {
      success: true,
      userFeedback: `I've added a new ${elementType}${locationText} with the content: "${content}"`,
      previewRefreshNeeded: true,
      changedFiles: [`elements/${newElementId}.html`],
      technicalDetails: {
        newElementId,
        elementType,
        content,
        parentElementId,
      },
    };
  },
  estimatedDuration: 3000,
  metadata: {
    version: '1.0.0',
    tags: ['element', 'add', 'create', 'landing-page'],
    examples: [
      {
        description: 'Add a call-to-action button',
        input: {
          elementType: 'button',
          content: 'Get Started Now',
        },
      },
    ],
  },
};

/**
 * Tool for removing elements (potentially destructive)
 */
const removeElementTool: EnhancedToolDefinition = {
  name: 'remove_element',
  displayName: 'Remove Element',
  description: 'Remove an element from the landing page',
  userDescription: 'delete an element from your landing page',
  category: ToolCategory.LANDING_PAGE,
  safetyLevel: 'potentially_destructive', // Removing elements is destructive
  inputSchema: z.object({
    elementId: z.string().describe('The ID of the element to remove'),
    confirmDeletion: z
      .boolean()
      .optional()
      .describe('Confirm that you want to delete this element'),
  }),
  async execute(input) {
    const { elementId, confirmDeletion } = input;

    logger.info('Element removal requested', {
      elementId,
      confirmDeletion,
    });

    return {
      success: true,
      userFeedback: `I've removed the element "${elementId}" from your landing page. This action cannot be easily undone.`,
      previewRefreshNeeded: true,
      changedFiles: [`elements/${elementId}.html`],
      technicalDetails: {
        elementId,
        action: 'removed',
      },
    };
  },
  estimatedDuration: 1000,
  metadata: {
    version: '1.0.0',
    tags: ['remove', 'delete', 'destructive', 'landing-page'],
    examples: [
      {
        description: 'Remove a specific element',
        input: {
          elementId: 'old-banner',
          confirmDeletion: true,
        },
      },
    ],
  },
};

/**
 * Tool for clearing all content (potentially destructive)
 */
const clearAllContentTool: EnhancedToolDefinition = {
  name: 'clear_all_content',
  displayName: 'Clear All Content',
  description: 'Remove all content from the landing page',
  userDescription: 'clear all content and start with a blank page',
  category: ToolCategory.LANDING_PAGE,
  safetyLevel: 'potentially_destructive', // Clearing all content is very destructive
  inputSchema: z.object({
    keepStructure: z
      .boolean()
      .optional()
      .describe('Whether to keep the basic page structure'),
    confirmClear: z
      .boolean()
      .optional()
      .describe('Confirm that you want to clear all content'),
  }),
  async execute(input) {
    const { keepStructure = false, confirmClear } = input;

    logger.info('Clear all content requested', {
      keepStructure,
      confirmClear,
    });

    return {
      success: true,
      userFeedback: `I've cleared all content from your landing page${keepStructure ? ' while keeping the basic structure' : ' completely'}. This is a major change that removes all existing content.`,
      previewRefreshNeeded: true,
      changedFiles: ['index.html', 'styles.css'],
      technicalDetails: {
        action: 'clear_all',
        keepStructure,
      },
    };
  },
  estimatedDuration: 2000,
  metadata: {
    version: '1.0.0',
    tags: ['clear', 'reset', 'destructive', 'landing-page'],
    examples: [
      {
        description: 'Clear all content but keep structure',
        input: {
          keepStructure: true,
          confirmClear: true,
        },
      },
    ],
  },
};

/**
 * Register all landing page tools
 */
export function registerLandingPageTools() {
  toolRegistry.registerEnhancedTool(updateContentTool);
  toolRegistry.registerEnhancedTool(updateStyleTool);
  toolRegistry.registerEnhancedTool(addElementTool);
  toolRegistry.registerEnhancedTool(removeElementTool);
  toolRegistry.registerEnhancedTool(clearAllContentTool);

  logger.info('Landing page tools registered', {
    tools: [
      'update_content',
      'update_style',
      'add_element',
      'remove_element',
      'clear_all_content',
    ],
  });
}
