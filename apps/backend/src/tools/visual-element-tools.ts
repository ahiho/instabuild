import { ToolCategory } from '@instabuild/shared/types';
import { z } from 'zod';
import { logger } from '../lib/logger.js';
import { toolRegistry } from '../services/toolRegistry.js';

/**
 * Visual Element Management Tools
 * Simplified version for content manipulation without database dependencies
 */

/**
 * Apply CSS styling to HTML content
 */
const applyCSSStylesTool = {
  name: 'apply_css_styles',
  displayName: 'Apply CSS Styles',
  description: 'Apply CSS styles to HTML content',
  userDescription: 'change the visual appearance and styling of your page',
  category: ToolCategory.LANDING_PAGE,
  safetyLevel: 'safe' as const, // CSS styling is safe
  inputSchema: z.object({
    cssRules: z.string().describe('CSS rules to apply'),
    description: z
      .string()
      .optional()
      .describe('Description of the styling changes'),
  }),
  execute: async (input: { cssRules: string; description?: string }) => {
    try {
      // This is a demonstration tool that would be used with the landing page update tool
      const styleDescription = input.description || 'Applied custom CSS styles';

      return {
        success: true,
        data: {
          cssRules: input.cssRules,
          description: styleDescription,
        },
        userFeedback: `Generated CSS styles: ${styleDescription}. Use the update_landing_page tool to apply these styles to your page.`,
        previewRefreshNeeded: false,
        technicalDetails: {
          cssRules: input.cssRules,
        },
      };
    } catch (error) {
      logger.error('Error generating CSS styles', { error });
      return {
        success: false,
        userFeedback: 'Failed to generate CSS styles',
        previewRefreshNeeded: false,
      };
    }
  },
  metadata: {
    version: '1.0.0',
    tags: ['css', 'styling', 'visual'],
    examples: [
      {
        description: 'Apply modern button styling',
        input: {
          cssRules:
            '.btn { background: #007bff; color: white; padding: 10px 20px; border-radius: 5px; border: none; cursor: pointer; } .btn:hover { background: #0056b3; }',
          description: 'Modern blue button with hover effect',
        },
      },
    ],
  },
};

/**
 * Generate HTML elements
 */
const generateHTMLElementTool = {
  name: 'generate_html_element',
  displayName: 'Generate HTML Element',
  description: 'Generate HTML elements with specified content and styling',
  userDescription: 'create new HTML elements for your landing page',
  category: ToolCategory.LANDING_PAGE,
  safetyLevel: 'safe' as const, // Generating HTML elements is safe
  inputSchema: z.object({
    elementType: z
      .enum([
        'heading',
        'paragraph',
        'button',
        'section',
        'div',
        'image',
        'link',
      ])
      .describe('Type of HTML element to generate'),
    content: z.string().describe('Content or text for the element'),
    cssClasses: z.string().optional().describe('CSS classes to apply'),
    attributes: z
      .record(z.string(), z.string())
      .optional()
      .describe('Additional HTML attributes'),
  }),
  execute: async (input: {
    elementType:
      | 'heading'
      | 'paragraph'
      | 'button'
      | 'section'
      | 'div'
      | 'image'
      | 'link';
    content: string;
    cssClasses?: string;
    attributes?: Record<string, string>;
  }) => {
    try {
      let htmlElement: string;
      const classes = input.cssClasses ? ` class="${input.cssClasses}"` : '';
      const attrs = input.attributes
        ? ' ' +
          Object.entries(input.attributes)
            .map(([key, value]) => `${key}="${value}"`)
            .join(' ')
        : '';

      switch (input.elementType) {
        case 'heading':
          htmlElement = `<h2${classes}${attrs}>${input.content}</h2>`;
          break;
        case 'paragraph':
          htmlElement = `<p${classes}${attrs}>${input.content}</p>`;
          break;
        case 'button':
          htmlElement = `<button${classes}${attrs}>${input.content}</button>`;
          break;
        case 'section':
          htmlElement = `<section${classes}${attrs}>${input.content}</section>`;
          break;
        case 'div':
          htmlElement = `<div${classes}${attrs}>${input.content}</div>`;
          break;
        case 'image':
          htmlElement = `<img${classes}${attrs} src="${input.content}" alt="Image" />`;
          break;
        case 'link':
          htmlElement = `<a${classes}${attrs} href="${input.content}">Link</a>`;
          break;
        default:
          htmlElement = `<div${classes}${attrs}>${input.content}</div>`;
      }

      return {
        success: true,
        data: {
          elementType: input.elementType,
          htmlElement,
          content: input.content,
        },
        userFeedback: `Generated ${input.elementType} element. Use the update_landing_page tool to add this to your page: ${htmlElement}`,
        previewRefreshNeeded: false,
        technicalDetails: {
          htmlElement,
        },
      };
    } catch (error) {
      logger.error('Error generating HTML element', { error });
      return {
        success: false,
        userFeedback: 'Failed to generate HTML element',
        previewRefreshNeeded: false,
      };
    }
  },
  metadata: {
    version: '1.0.0',
    tags: ['html', 'elements', 'generation'],
    examples: [
      {
        description: 'Generate a call-to-action button',
        input: {
          elementType: 'button',
          content: 'Get Started Now',
          cssClasses: 'btn btn-primary',
          attributes: { 'data-action': 'signup' },
        },
      },
    ],
  },
};

/**
 * Apply theme to HTML content
 */
const applyThemeTool = {
  name: 'apply_theme',
  displayName: 'Apply Theme',
  description: 'Apply a predefined visual theme to content',
  userDescription: 'change the overall visual theme of your landing page',
  category: ToolCategory.LANDING_PAGE,
  safetyLevel: 'potentially_destructive' as const, // Theme changes can be destructive to existing styling
  inputSchema: z.object({
    theme: z
      .enum(['modern', 'classic', 'minimal', 'bold', 'elegant'])
      .describe('The theme to apply'),
    primaryColor: z
      .string()
      .optional()
      .describe('Primary color for the theme (hex code)'),
    secondaryColor: z
      .string()
      .optional()
      .describe('Secondary color for the theme (hex code)'),
  }),
  execute: async (input: {
    theme: 'modern' | 'classic' | 'minimal' | 'bold' | 'elegant';
    primaryColor?: string;
    secondaryColor?: string;
  }) => {
    try {
      const primaryColor = input.primaryColor || '#007bff';
      const secondaryColor = input.secondaryColor || '#6c757d';

      let themeCSS = `
/* ${input.theme.toUpperCase()} THEME */
:root {
  --primary-color: ${primaryColor};
  --secondary-color: ${secondaryColor};
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  margin: 0;
  padding: 20px;
}
`;

      switch (input.theme) {
        case 'modern':
          themeCSS += `
body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
h1, h2, h3 { font-weight: 300; letter-spacing: -0.5px; }
button { background: var(--primary-color); color: white; border: none; padding: 12px 24px; border-radius: 25px; font-weight: 500; cursor: pointer; transition: all 0.3s ease; }
button:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
`;
          break;
        case 'classic':
          themeCSS += `
body { background: #f8f9fa; color: #333; }
h1, h2, h3 { font-family: Georgia, serif; color: var(--primary-color); }
button { background: var(--primary-color); color: white; border: 2px solid var(--primary-color); padding: 10px 20px; border-radius: 4px; font-weight: bold; cursor: pointer; }
button:hover { background: white; color: var(--primary-color); }
`;
          break;
        case 'minimal':
          themeCSS += `
body { background: white; color: #333; }
h1, h2, h3 { font-weight: 400; color: #222; }
button { background: transparent; color: var(--primary-color); border: 1px solid var(--primary-color); padding: 8px 16px; border-radius: 2px; cursor: pointer; }
button:hover { background: var(--primary-color); color: white; }
`;
          break;
        case 'bold':
          themeCSS += `
body { background: #000; color: #fff; }
h1, h2, h3 { font-weight: 900; text-transform: uppercase; color: var(--primary-color); }
button { background: var(--primary-color); color: black; border: none; padding: 15px 30px; border-radius: 0; font-weight: 900; text-transform: uppercase; cursor: pointer; }
button:hover { background: var(--secondary-color); }
`;
          break;
        case 'elegant':
          themeCSS += `
body { background: #fafafa; color: #444; }
h1, h2, h3 { font-family: 'Playfair Display', serif; font-weight: 400; color: var(--primary-color); }
button { background: var(--primary-color); color: white; border: none; padding: 12px 30px; border-radius: 30px; font-style: italic; cursor: pointer; transition: all 0.3s ease; }
button:hover { background: var(--secondary-color); }
`;
          break;
      }

      return {
        success: true,
        data: {
          theme: input.theme,
          primaryColor,
          secondaryColor,
          themeCSS,
        },
        userFeedback: `Generated ${input.theme} theme CSS with ${primaryColor} as primary color. Use the update_landing_page tool to apply this theme to your page.`,
        previewRefreshNeeded: false,
        technicalDetails: {
          themeCSS,
        },
      };
    } catch (error) {
      logger.error('Error applying theme', { error });
      return {
        success: false,
        userFeedback: 'Failed to apply theme',
        previewRefreshNeeded: false,
      };
    }
  },
  metadata: {
    version: '1.0.0',
    tags: ['theme', 'styling', 'css'],
    examples: [
      {
        description: 'Apply modern theme with custom colors',
        input: {
          theme: 'modern',
          primaryColor: '#ff6b6b',
          secondaryColor: '#4ecdc4',
        },
      },
    ],
  },
};

/**
 * Register all visual element tools
 */
export function registerVisualElementTools(): void {
  try {
    // Register with main registry for AI SDK compatibility
    toolRegistry.registerTool(applyCSSStylesTool);
    toolRegistry.registerTool(generateHTMLElementTool);
    toolRegistry.registerTool(applyThemeTool);

    logger.info('Visual element tools registered successfully', {
      toolCount: 3,
      tools: ['apply_css_styles', 'generate_html_element', 'apply_theme'],
    });
  } catch (error) {
    logger.error('Failed to register visual element tools', { error });
    throw error;
  }
}
