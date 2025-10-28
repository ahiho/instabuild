import type {
  EnhancedToolDefinition,
  ToolExecutionContext,
} from '@instabuild/shared/types';
import { ToolCategory } from '@instabuild/shared/types';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';
import { logger } from '../lib/logger.js';
import { toolRegistry } from '../services/toolRegistry.js';

/**
 * Validation result for a single file
 */
interface ValidationResult {
  filePath: string;
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error details
 */
interface ValidationError {
  line?: number;
  column?: number;
  message: string;
  type: 'syntax' | 'reference' | 'semantic';
  severity: 'error' | 'warning';
}

/**
 * Validation warning details
 */
interface ValidationWarning {
  line?: number;
  column?: number;
  message: string;
  type: 'style' | 'best-practice' | 'performance';
}

/**
 * HTML validation using basic syntax checking
 */
function validateHTML(content: string, filePath: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const lines = content.split('\n');

  // Basic HTML validation
  const tagStack: Array<{ tag: string; line: number }> = [];
  const selfClosingTags = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
  ]);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    // Check for unclosed tags
    const tagMatches = line.match(/<\/?[^>]+>/g);
    if (tagMatches) {
      tagMatches.forEach(tag => {
        const isClosing = tag.startsWith('</');
        const isSelfClosing =
          tag.endsWith('/>') ||
          selfClosingTags.has(tag.match(/<\/?(\w+)/)?.[1] || '');
        const tagName = tag.match(/<\/?(\w+)/)?.[1];

        if (!tagName) return;

        if (isClosing) {
          const lastOpen = tagStack.pop();
          if (!lastOpen || lastOpen.tag !== tagName) {
            errors.push({
              line: lineNumber,
              message: `Mismatched closing tag: ${tag}`,
              type: 'syntax',
              severity: 'error',
            });
          }
        } else if (!isSelfClosing) {
          tagStack.push({ tag: tagName, line: lineNumber });
        }
      });
    }

    // Check for common HTML issues
    if (line.includes('onclick=') || line.includes('onload=')) {
      warnings.push({
        line: lineNumber,
        message:
          'Inline event handlers should be avoided for security and maintainability',
        type: 'best-practice',
      });
    }

    if (line.includes('<img') && !line.includes('alt=')) {
      warnings.push({
        line: lineNumber,
        message: 'Image tags should include alt attributes for accessibility',
        type: 'best-practice',
      });
    }
  });

  // Check for unclosed tags
  tagStack.forEach(openTag => {
    errors.push({
      line: openTag.line,
      message: `Unclosed tag: <${openTag.tag}>`,
      type: 'syntax',
      severity: 'error',
    });
  });

  return {
    filePath,
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * CSS validation using basic syntax checking
 */
function validateCSS(content: string, filePath: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const lines = content.split('\n');

  let braceCount = 0;
  let inComment = false;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    let processedLine = line;

    // Handle comments
    if (inComment) {
      const commentEnd = processedLine.indexOf('*/');
      if (commentEnd !== -1) {
        inComment = false;
        processedLine = processedLine.substring(commentEnd + 2);
      } else {
        return; // Skip lines inside comments
      }
    }

    const commentStart = processedLine.indexOf('/*');
    if (commentStart !== -1) {
      const commentEnd = processedLine.indexOf('*/', commentStart);
      if (commentEnd !== -1) {
        processedLine =
          processedLine.substring(0, commentStart) +
          processedLine.substring(commentEnd + 2);
      } else {
        inComment = true;
        processedLine = processedLine.substring(0, commentStart);
      }
    }

    // Remove single-line comments
    const singleCommentIndex = processedLine.indexOf('//');
    if (singleCommentIndex !== -1) {
      processedLine = processedLine.substring(0, singleCommentIndex);
    }

    // Count braces
    const openBraces = (processedLine.match(/\{/g) || []).length;
    const closeBraces = (processedLine.match(/\}/g) || []).length;
    braceCount += openBraces - closeBraces;

    // Check for basic syntax errors
    if (
      processedLine.includes(':') &&
      !processedLine.includes(';') &&
      processedLine.trim() &&
      !processedLine.includes('{') &&
      !processedLine.includes('}')
    ) {
      const trimmed = processedLine.trim();
      if (!trimmed.endsWith(',') && !trimmed.startsWith('@')) {
        warnings.push({
          line: lineNumber,
          message: 'CSS property should end with semicolon',
          type: 'style',
        });
      }
    }

    // Check for vendor prefixes without standard property
    if (
      processedLine.includes('-webkit-') ||
      processedLine.includes('-moz-') ||
      processedLine.includes('-ms-')
    ) {
      warnings.push({
        line: lineNumber,
        message:
          'Consider using autoprefixer instead of manual vendor prefixes',
        type: 'best-practice',
      });
    }

    // Check for !important usage
    if (processedLine.includes('!important')) {
      warnings.push({
        line: lineNumber,
        message:
          'Avoid using !important, consider improving CSS specificity instead',
        type: 'best-practice',
      });
    }
  });

  if (braceCount !== 0) {
    errors.push({
      message: `Mismatched braces: ${braceCount > 0 ? 'missing closing' : 'extra closing'} braces`,
      type: 'syntax',
      severity: 'error',
    });
  }

  return {
    filePath,
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * JavaScript/TypeScript validation using basic syntax checking
 */
function validateJavaScript(
  content: string,
  filePath: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const lines = content.split('\n');

  let braceCount = 0;
  let parenCount = 0;
  let bracketCount = 0;
  let inString = false;
  let stringChar = '';
  let inComment = false;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      // Handle multi-line comments
      if (!inString && char === '/' && nextChar === '*') {
        inComment = true;
        i += 2;
        continue;
      }
      if (inComment && char === '*' && nextChar === '/') {
        inComment = false;
        i += 2;
        continue;
      }
      if (inComment) {
        i++;
        continue;
      }

      // Handle single-line comments
      if (!inString && char === '/' && nextChar === '/') {
        break; // Rest of line is comment
      }

      // Handle strings
      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && line[i - 1] !== '\\') {
        inString = false;
        stringChar = '';
      }

      if (!inString) {
        // Count brackets and braces
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (char === '(') parenCount++;
        if (char === ')') parenCount--;
        if (char === '[') bracketCount++;
        if (char === ']') bracketCount--;
      }

      i++;
    }

    // Check for common issues
    const trimmedLine = line.trim();

    // Check for console.log in production code
    if (
      trimmedLine.includes('console.log') &&
      !filePath.includes('test') &&
      !filePath.includes('spec')
    ) {
      warnings.push({
        line: lineNumber,
        message:
          'console.log statements should be removed from production code',
        type: 'best-practice',
      });
    }

    // Check for var usage
    if (trimmedLine.includes('var ')) {
      warnings.push({
        line: lineNumber,
        message: 'Use let or const instead of var',
        type: 'best-practice',
      });
    }

    // Check for == usage
    if (
      trimmedLine.includes('==') &&
      !trimmedLine.includes('===') &&
      !trimmedLine.includes('!==')
    ) {
      warnings.push({
        line: lineNumber,
        message: 'Use === instead of == for strict equality',
        type: 'best-practice',
      });
    }
  });

  // Check for unmatched brackets
  if (braceCount !== 0) {
    errors.push({
      message: `Mismatched braces: ${braceCount > 0 ? 'missing closing' : 'extra closing'} braces`,
      type: 'syntax',
      severity: 'error',
    });
  }
  if (parenCount !== 0) {
    errors.push({
      message: `Mismatched parentheses: ${parenCount > 0 ? 'missing closing' : 'extra closing'} parentheses`,
      type: 'syntax',
      severity: 'error',
    });
  }
  if (bracketCount !== 0) {
    errors.push({
      message: `Mismatched brackets: ${bracketCount > 0 ? 'missing closing' : 'extra closing'} brackets`,
      type: 'syntax',
      severity: 'error',
    });
  }

  return {
    filePath,
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check file references across the project
 */
async function validateFileReferences(
  content: string,
  filePath: string,
  projectRoot: string
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Check for various types of file references
    const patterns = [
      // CSS/HTML: url(), src="", href=""
      /(?:url\(|src="|href="|@import\s+")([^"')]+)["')]/g,
      // JavaScript/TypeScript: import/require statements
      /(?:import.*from\s+['"]|require\(['"])([^'"]+)['"]/g,
      // HTML: script src, link href
      /<(?:script|link|img)[^>]*(?:src|href)=["']([^"']+)["']/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const referencedPath = match[1];

        // Skip external URLs and data URLs
        if (
          referencedPath.startsWith('http') ||
          referencedPath.startsWith('//') ||
          referencedPath.startsWith('data:') ||
          referencedPath.startsWith('#')
        ) {
          continue;
        }

        // Resolve relative path
        let resolvedPath: string;
        if (path.isAbsolute(referencedPath)) {
          resolvedPath = referencedPath;
        } else {
          resolvedPath = path.resolve(path.dirname(filePath), referencedPath);
        }

        // Check if file exists
        try {
          await fs.access(resolvedPath);
        } catch {
          errors.push({
            line: lineNumber,
            message: `Referenced file not found: ${referencedPath}`,
            type: 'reference',
            severity: 'error',
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Tool for validating code syntax and file references
 */
const validateCodeTool: EnhancedToolDefinition = {
  name: 'validate_code',
  displayName: 'ValidateCode',
  description:
    'Validates HTML, CSS, and JavaScript/TypeScript files for syntax errors, checks file references, and provides suggestions for code improvements. Helps ensure code quality and catch common issues before deployment.',
  userDescription: 'validate code syntax and check file references for errors',
  category: ToolCategory.VALIDATION,
  safetyLevel: 'safe',
  inputSchema: z.object({
    file_path: z.string().describe('The absolute path to the file to validate'),
    check_references: z
      .boolean()
      .optional()
      .describe('Whether to check file references (default: true)'),
    project_root: z
      .string()
      .optional()
      .describe('The project root directory for resolving relative references'),
  }),

  async execute(
    input: {
      file_path: string;
      check_references?: boolean;
      project_root?: string;
    },
    context: ToolExecutionContext
  ) {
    try {
      const {
        file_path: filePath,
        check_references = true,
        project_root,
      } = input;

      logger.info('Code validation requested', {
        path: filePath,
        checkReferences: check_references,
        toolCallId: context.toolCallId,
      });

      // Validate path is absolute
      if (!path.isAbsolute(filePath)) {
        return {
          success: false,
          userFeedback: `File path must be absolute: ${filePath}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Path must be absolute',
            providedPath: filePath,
          },
        };
      }

      // Check if file exists
      try {
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) {
          return {
            success: false,
            userFeedback: `Path is not a file: ${filePath}`,
            previewRefreshNeeded: false,
            technicalDetails: {
              error: 'Path is not a file',
              path: filePath,
            },
          };
        }
      } catch (error) {
        return {
          success: false,
          userFeedback: `File not found: ${filePath}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'File not found',
            path: filePath,
          },
        };
      }

      // Read file content
      const content = await fs.readFile(filePath, 'utf8');
      const fileExtension = path.extname(filePath).toLowerCase();

      let validationResult: ValidationResult;

      // Validate based on file type
      switch (fileExtension) {
        case '.html':
        case '.htm':
          validationResult = validateHTML(content, filePath);
          break;
        case '.css':
          validationResult = validateCSS(content, filePath);
          break;
        case '.js':
        case '.jsx':
        case '.ts':
        case '.tsx':
          validationResult = validateJavaScript(content, filePath);
          break;
        default:
          return {
            success: false,
            userFeedback: `Unsupported file type: ${fileExtension}`,
            previewRefreshNeeded: false,
            technicalDetails: {
              error: 'Unsupported file type',
              extension: fileExtension,
            },
          };
      }

      // Check file references if requested
      if (check_references) {
        const projectRoot = project_root || process.cwd();
        const referenceErrors = await validateFileReferences(
          content,
          filePath,
          projectRoot
        );
        validationResult.errors.push(...referenceErrors);
        validationResult.isValid =
          validationResult.isValid && referenceErrors.length === 0;
      }

      // Format results
      const errorCount = validationResult.errors.length;
      const warningCount = validationResult.warnings.length;

      let resultMessage = `Validation complete for ${path.basename(filePath)}:\n`;

      if (validationResult.isValid && warningCount === 0) {
        resultMessage += '✅ No issues found';
      } else {
        if (errorCount > 0) {
          resultMessage += `❌ ${errorCount} error(s) found:\n`;
          validationResult.errors.forEach(error => {
            const location = error.line ? ` (line ${error.line})` : '';
            resultMessage += `  • ${error.message}${location}\n`;
          });
        }

        if (warningCount > 0) {
          resultMessage += `⚠️  ${warningCount} warning(s) found:\n`;
          validationResult.warnings.forEach(warning => {
            const location = warning.line ? ` (line ${warning.line})` : '';
            resultMessage += `  • ${warning.message}${location}\n`;
          });
        }
      }

      const userMessage = validationResult.isValid
        ? `File is valid${warningCount > 0 ? ` (${warningCount} warnings)` : ''}`
        : `Found ${errorCount} error(s)${warningCount > 0 ? ` and ${warningCount} warning(s)` : ''}`;

      return {
        success: true,
        data: {
          validation: validationResult,
          summary: {
            isValid: validationResult.isValid,
            errorCount,
            warningCount,
            fileType: fileExtension,
          },
        },
        userFeedback: userMessage,
        previewRefreshNeeded: false,
        technicalDetails: {
          path: filePath,
          validation: validationResult,
          formattedResults: resultMessage.trim(),
        },
      };
    } catch (error) {
      logger.error('Error validating code', {
        error: error instanceof Error ? error.message : String(error),
        toolCallId: context.toolCallId,
      });

      return {
        success: false,
        userFeedback: 'Failed to validate code',
        previewRefreshNeeded: false,
        technicalDetails: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },

  estimatedDuration: 3000,
  metadata: {
    version: '1.0.0',
    tags: ['validation', 'syntax', 'code-quality', 'linting'],
    examples: [
      {
        description: 'Validate an HTML file',
        input: {
          file_path: '/home/user/project/index.html',
          check_references: true,
        },
      },
      {
        description: 'Validate a CSS file without reference checking',
        input: {
          file_path: '/home/user/project/styles.css',
          check_references: false,
        },
      },
    ],
  },
};

/**
 * Tool for automatically fixing common code issues
 */
const fixCodeTool: EnhancedToolDefinition = {
  name: 'fix_code',
  displayName: 'FixCode',
  description:
    'Automatically fixes common code issues found during validation, such as missing semicolons, unclosed tags, and basic syntax errors. Creates a backup of the original file before making changes.',
  userDescription: 'automatically fix common code syntax and style issues',
  category: ToolCategory.VALIDATION,
  safetyLevel: 'potentially_destructive',
  inputSchema: z.object({
    file_path: z.string().describe('The absolute path to the file to fix'),
    create_backup: z
      .boolean()
      .optional()
      .describe('Whether to create a backup file (default: true)'),
    fix_types: z
      .array(z.enum(['syntax', 'style', 'references']))
      .optional()
      .describe('Types of issues to fix (default: all)'),
  }),

  async execute(
    input: {
      file_path: string;
      create_backup?: boolean;
      fix_types?: ('syntax' | 'style' | 'references')[];
    },
    context: ToolExecutionContext
  ) {
    try {
      const {
        file_path: filePath,
        create_backup = true,
        fix_types = ['syntax', 'style'],
      } = input;

      logger.info('Code fixing requested', {
        path: filePath,
        createBackup: create_backup,
        fixTypes: fix_types,
        toolCallId: context.toolCallId,
      });

      // Validate path is absolute
      if (!path.isAbsolute(filePath)) {
        return {
          success: false,
          userFeedback: `File path must be absolute: ${filePath}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Path must be absolute',
            providedPath: filePath,
          },
        };
      }

      // Read original content
      const originalContent = await fs.readFile(filePath, 'utf8');
      let fixedContent = originalContent;
      const fixes: string[] = [];

      const fileExtension = path.extname(filePath).toLowerCase();

      // Create backup if requested
      if (create_backup) {
        const backupPath = `${filePath}.backup`;
        await fs.writeFile(backupPath, originalContent, 'utf8');
        fixes.push(`Created backup at ${backupPath}`);
      }

      // Apply fixes based on file type and requested fix types
      if (fix_types.includes('style')) {
        if (fileExtension === '.css') {
          // Fix missing semicolons in CSS
          fixedContent = fixedContent.replace(
            /([^;{}])\s*\n\s*([a-zA-Z-]+\s*:)/g,
            '$1;\n  $2'
          );
          if (fixedContent !== originalContent) {
            fixes.push('Added missing semicolons in CSS properties');
          }
        }

        if (['.js', '.jsx', '.ts', '.tsx'].includes(fileExtension)) {
          // Fix var to let/const
          const varCount = (fixedContent.match(/\bvar\s+/g) || []).length;
          fixedContent = fixedContent.replace(/\bvar\s+/g, 'let ');
          if (varCount > 0) {
            fixes.push(`Replaced ${varCount} 'var' declarations with 'let'`);
          }

          // Fix == to ===
          const eqCount = (fixedContent.match(/[^=!]==(?!=)/g) || []).length;
          fixedContent = fixedContent.replace(/([^=!])==(?!=)/g, '$1===');
          if (eqCount > 0) {
            fixes.push(`Replaced ${eqCount} '==' with '==='`);
          }
        }
      }

      if (fix_types.includes('syntax')) {
        if (fileExtension === '.html') {
          // Add missing alt attributes to images
          const imgMatches = fixedContent.match(/<img[^>]*>/g);
          if (imgMatches) {
            imgMatches.forEach(img => {
              if (!img.includes('alt=')) {
                const fixedImg = img.replace('>', ' alt="">');
                fixedContent = fixedContent.replace(img, fixedImg);
                fixes.push('Added missing alt attributes to images');
              }
            });
          }
        }
      }

      // Write fixed content if changes were made
      if (fixedContent !== originalContent) {
        await fs.writeFile(filePath, fixedContent, 'utf8');

        const fixCount = fixes.length - (create_backup ? 1 : 0);
        const userMessage = `Applied ${fixCount} fix(es) to ${path.basename(filePath)}`;

        return {
          success: true,
          data: {
            fixes,
            fixCount,
            hasBackup: create_backup,
            originalLength: originalContent.length,
            fixedLength: fixedContent.length,
          },
          userFeedback: userMessage,
          previewRefreshNeeded: true,
          changedFiles: [filePath],
          technicalDetails: {
            path: filePath,
            fixes,
            fixCount,
            hasBackup: create_backup,
          },
        };
      } else {
        return {
          success: true,
          data: {
            fixes: [],
            fixCount: 0,
            hasBackup: create_backup,
            originalLength: originalContent.length,
            fixedLength: fixedContent.length,
          },
          userFeedback: 'No fixes needed - file is already in good shape',
          previewRefreshNeeded: false,
          technicalDetails: {
            path: filePath,
            message: 'No fixes applied',
          },
        };
      }
    } catch (error) {
      logger.error('Error fixing code', {
        error: error instanceof Error ? error.message : String(error),
        toolCallId: context.toolCallId,
      });

      return {
        success: false,
        userFeedback: 'Failed to fix code',
        previewRefreshNeeded: false,
        technicalDetails: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },

  estimatedDuration: 4000,
  metadata: {
    version: '1.0.0',
    tags: ['validation', 'fix', 'auto-repair', 'code-quality'],
    examples: [
      {
        description: 'Fix syntax and style issues in a JavaScript file',
        input: {
          file_path: '/home/user/project/script.js',
          create_backup: true,
          fix_types: ['syntax', 'style'],
        },
      },
      {
        description: 'Fix only style issues without backup',
        input: {
          file_path: '/home/user/project/styles.css',
          create_backup: false,
          fix_types: ['style'],
        },
      },
    ],
  },
};

/**
 * Register validation tools
 */
export function registerValidationTools() {
  try {
    toolRegistry.registerEnhancedTool(validateCodeTool);
    toolRegistry.registerEnhancedTool(fixCodeTool);

    logger.info('Validation tools registered successfully', {
      toolCount: 2,
      tools: ['validate_code', 'fix_code'],
    });
  } catch (error) {
    logger.error('Failed to register validation tools', { error });
    throw error;
  }
}
