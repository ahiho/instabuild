/* eslint-disable camelcase */
import type {
  EnhancedToolDefinition,
  ToolExecutionContext,
} from '@instabuild/shared/types';
import { ToolCategory } from '@instabuild/shared/types';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';
import { logger } from '../lib/logger.js';
import { toolRegistry } from '../services/toolRegistry.js';

/**
 * Asset optimization result
 */
interface OptimizationResult {
  originalPath: string;
  optimizedPath: string;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  format: string;
}

/**
 * Check if ImageMagick is available
 */
function isImageMagickAvailable(): boolean {
  try {
    execSync('convert -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if sharp is available (Node.js image processing)
 */
async function isSharpAvailable(): Promise<boolean> {
  try {
    await import('sharp');
    return true;
  } catch {
    return false;
  }
}

/**
 * Optimize image using ImageMagick
 */
async function optimizeImageWithImageMagick(
  inputPath: string,
  outputPath: string,
  quality: number = 85
): Promise<OptimizationResult> {
  const originalStats = await fs.stat(inputPath);
  const originalSize = originalStats.size;

  const ext = path.extname(inputPath).toLowerCase();
  let command: string;

  switch (ext) {
    case '.jpg':
    case '.jpeg':
      command = `convert "${inputPath}" -quality ${quality} -strip "${outputPath}"`;
      break;
    case '.png':
      command = `convert "${inputPath}" -quality ${quality} -strip "${outputPath}"`;
      break;
    case '.webp':
      command = `convert "${inputPath}" -quality ${quality} "${outputPath}"`;
      break;
    default:
      throw new Error(`Unsupported image format: ${ext}`);
  }

  execSync(command);

  const optimizedStats = await fs.stat(outputPath);
  const optimizedSize = optimizedStats.size;
  const compressionRatio =
    ((originalSize - optimizedSize) / originalSize) * 100;

  return {
    originalPath: inputPath,
    optimizedPath: outputPath,
    originalSize,
    optimizedSize,
    compressionRatio,
    format: ext.substring(1),
  };
}

/**
 * Optimize image using Sharp (if available)
 */
async function optimizeImageWithSharp(
  inputPath: string,
  outputPath: string,
  quality: number = 85
): Promise<OptimizationResult> {
  const sharp = await import('sharp');
  const originalStats = await fs.stat(inputPath);
  const originalSize = originalStats.size;

  const ext = path.extname(outputPath).toLowerCase();
  let sharpInstance = sharp.default(inputPath);

  switch (ext) {
    case '.jpg':
    case '.jpeg':
      sharpInstance = sharpInstance.jpeg({ quality, progressive: true });
      break;
    case '.png':
      sharpInstance = sharpInstance.png({ quality, progressive: true });
      break;
    case '.webp':
      sharpInstance = sharpInstance.webp({ quality });
      break;
    default:
      throw new Error(`Unsupported image format: ${ext}`);
  }

  await sharpInstance.toFile(outputPath);

  const optimizedStats = await fs.stat(outputPath);
  const optimizedSize = optimizedStats.size;
  const compressionRatio =
    ((originalSize - optimizedSize) / originalSize) * 100;

  return {
    originalPath: inputPath,
    optimizedPath: outputPath,
    originalSize,
    optimizedSize,
    compressionRatio,
    format: ext.substring(1),
  };
}

/**
 * Find and update file references in project files
 */
async function updateFileReferences(
  oldPath: string,
  newPath: string,
  projectRoot: string
): Promise<Array<{ file: string; changes: number }>> {
  const updatedFiles: Array<{ file: string; changes: number }> = [];

  // Find all files that might contain references
  const searchExtensions = [
    '.html',
    '.css',
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.json',
    '.md',
  ];
  const filesToSearch: string[] = [];

  async function findFiles(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip common directories
        if (
          ['node_modules', '.git', 'dist', 'build', '.next'].includes(
            entry.name
          )
        ) {
          continue;
        }
        await findFiles(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (searchExtensions.includes(ext)) {
          filesToSearch.push(fullPath);
        }
      }
    }
  }

  await findFiles(projectRoot);

  // Create relative paths for replacement
  const oldRelative = path.relative(projectRoot, oldPath);
  const newRelative = path.relative(projectRoot, newPath);
  const oldBasename = path.basename(oldPath);
  const newBasename = path.basename(newPath);

  for (const filePath of filesToSearch) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      let updatedContent = content;
      let changeCount = 0;

      // Replace various reference patterns
      const patterns = [
        // Exact path matches
        new RegExp(escapeRegExp(oldRelative), 'g'),
        new RegExp(escapeRegExp(oldPath), 'g'),
        // Basename matches (for cases where only filename is referenced)
        new RegExp(`(['"\`])${escapeRegExp(oldBasename)}\\1`, 'g'),
        // URL patterns
        new RegExp(
          `(src=|href=|url\\()(['"\`]?)${escapeRegExp(oldRelative)}\\2`,
          'g'
        ),
      ];

      const replacements = [
        newRelative,
        newPath,
        `$1${newBasename}$1`,
        `$1$2${newRelative}$2`,
      ];

      patterns.forEach((pattern, index) => {
        const matches = content.match(pattern);
        if (matches) {
          updatedContent = updatedContent.replace(pattern, replacements[index]);
          changeCount += matches.length;
        }
      });

      if (changeCount > 0) {
        await fs.writeFile(filePath, updatedContent, 'utf8');
        updatedFiles.push({
          file: path.relative(projectRoot, filePath),
          changes: changeCount,
        });
      }
    } catch (error) {
      logger.debug(`Could not process file ${filePath}`, { error });
    }
  }

  return updatedFiles;
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Tool for optimizing images
 */
const optimizeImageTool: EnhancedToolDefinition = {
  name: 'optimize_image',
  displayName: 'OptimizeImage',
  description:
    'Optimizes images by reducing file size while maintaining visual quality. Supports JPEG, PNG, and WebP formats. Uses Sharp (Node.js) or ImageMagick for processing.',
  userDescription:
    'optimize images to reduce file size while maintaining quality',
  category: ToolCategory.ASSET_MANAGEMENT,
  safetyLevel: 'safe',
  inputSchema: z.object({
    input_path: z
      .string()
      .describe('The absolute path to the image file to optimize'),
    output_path: z
      .string()
      .optional()
      .describe(
        'The output path (optional, defaults to input path with _optimized suffix)'
      ),
    quality: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe('Quality level (1-100, default: 85)'),
    format: z
      .enum(['jpeg', 'png', 'webp'])
      .optional()
      .describe('Output format (optional, defaults to input format)'),
  }),

  async execute(
    input: {
      input_path: string;
      output_path?: string;
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp';
    },
    context: ToolExecutionContext
  ) {
    try {
      const {
        input_path: inputPath,
        output_path,
        quality = 85,
        format,
      } = input;

      logger.info('Image optimization requested', {
        inputPath,
        outputPath: output_path,
        quality,
        format,
        toolCallId: context.toolCallId,
      });

      // Validate input path
      if (!path.isAbsolute(inputPath)) {
        return {
          success: false,
          userFeedback: `Input path must be absolute: ${inputPath}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Path must be absolute',
            providedPath: inputPath,
          },
        };
      }

      // Check if input file exists
      try {
        const stats = await fs.stat(inputPath);
        if (!stats.isFile()) {
          return {
            success: false,
            userFeedback: `Input path is not a file: ${inputPath}`,
            previewRefreshNeeded: false,
            technicalDetails: {
              error: 'Path is not a file',
              path: inputPath,
            },
          };
        }
      } catch (error) {
        return {
          success: false,
          userFeedback: `Input file not found: ${inputPath}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'File not found',
            path: inputPath,
          },
        };
      }

      // Determine output path
      const inputExt = path.extname(inputPath);
      const outputExt = format ? `.${format}` : inputExt;
      const finalOutputPath =
        output_path ||
        path.join(
          path.dirname(inputPath),
          path.basename(inputPath, inputExt) + '_optimized' + outputExt
        );

      // Validate image format
      const supportedFormats = ['.jpg', '.jpeg', '.png', '.webp'];
      if (!supportedFormats.includes(inputExt.toLowerCase())) {
        return {
          success: false,
          userFeedback: `Unsupported image format: ${inputExt}. Supported formats: ${supportedFormats.join(', ')}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Unsupported format',
            format: inputExt,
            supportedFormats,
          },
        };
      }

      // Create output directory if needed
      await fs.mkdir(path.dirname(finalOutputPath), { recursive: true });

      let result: OptimizationResult;

      // Try Sharp first, then ImageMagick
      try {
        if (await isSharpAvailable()) {
          result = await optimizeImageWithSharp(
            inputPath,
            finalOutputPath,
            quality
          );
        } else if (isImageMagickAvailable()) {
          result = await optimizeImageWithImageMagick(
            inputPath,
            finalOutputPath,
            quality
          );
        } else {
          return {
            success: false,
            userFeedback:
              'No image optimization tools available. Please install Sharp (npm install sharp) or ImageMagick.',
            previewRefreshNeeded: false,
            technicalDetails: {
              error: 'No optimization tools available',
              suggestions: ['npm install sharp', 'Install ImageMagick'],
            },
          };
        }
      } catch (error) {
        return {
          success: false,
          userFeedback: `Image optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: error instanceof Error ? error.message : String(error),
            inputPath,
            outputPath: finalOutputPath,
          },
        };
      }

      const sizeDiff = result.originalSize - result.optimizedSize;
      const userMessage = `Optimized ${path.basename(inputPath)}: ${result.compressionRatio.toFixed(1)}% smaller (saved ${(sizeDiff / 1024).toFixed(1)} KB)`;

      return {
        success: true,
        data: {
          optimization: result,
          sizeSaved: sizeDiff,
          compressionRatio: result.compressionRatio,
        },
        userFeedback: userMessage,
        previewRefreshNeeded: true,
        changedFiles: [finalOutputPath],
        technicalDetails: {
          optimization: result,
          tool: (await isSharpAvailable()) ? 'Sharp' : 'ImageMagick',
        },
      };
    } catch (error) {
      logger.error('Error optimizing image', {
        error: error instanceof Error ? error.message : String(error),
        toolCallId: context.toolCallId,
      });

      return {
        success: false,
        userFeedback: 'Failed to optimize image',
        previewRefreshNeeded: false,
        technicalDetails: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },

  estimatedDuration: 5000,
  metadata: {
    version: '1.0.0',
    tags: ['assets', 'images', 'optimization', 'compression'],
    examples: [
      {
        description: 'Optimize a JPEG image with default settings',
        input: {
          input_path: '/home/user/project/images/photo.jpg',
        },
      },
      {
        description: 'Convert PNG to WebP with custom quality',
        input: {
          input_path: '/home/user/project/images/logo.png',
          output_path: '/home/user/project/images/logo.webp',
          format: 'webp',
          quality: 90,
        },
      },
    ],
  },
};

/**
 * Tool for organizing assets into proper directory structure
 */
const organizeAssetsTool: EnhancedToolDefinition = {
  name: 'organize_assets',
  displayName: 'OrganizeAssets',
  description:
    'Organizes project assets into a proper directory structure and updates all file references. Creates directories for images, fonts, icons, and other assets.',
  userDescription:
    'organize project assets into proper folders and update references',
  category: ToolCategory.ASSET_MANAGEMENT,
  safetyLevel: 'potentially_destructive',
  inputSchema: z.object({
    project_root: z
      .string()
      .describe('The absolute path to the project root directory'),
    asset_structure: z
      .object({
        images: z
          .string()
          .optional()
          .describe('Directory for images (default: assets/images)'),
        fonts: z
          .string()
          .optional()
          .describe('Directory for fonts (default: assets/fonts)'),
        icons: z
          .string()
          .optional()
          .describe('Directory for icons (default: assets/icons)'),
        videos: z
          .string()
          .optional()
          .describe('Directory for videos (default: assets/videos)'),
      })
      .optional()
      .describe('Custom asset directory structure'),
    update_references: z
      .boolean()
      .optional()
      .describe('Whether to update file references (default: true)'),
  }),

  async execute(
    input: {
      project_root: string;
      asset_structure?: {
        images?: string;
        fonts?: string;
        icons?: string;
        videos?: string;
      };
      update_references?: boolean;
    },
    context: ToolExecutionContext
  ) {
    try {
      const {
        project_root: projectRoot,
        asset_structure = {},
        update_references = true,
      } = input;

      logger.info('Asset organization requested', {
        projectRoot,
        assetStructure: asset_structure,
        updateReferences: update_references,
        toolCallId: context.toolCallId,
      });

      // Validate project root
      if (!path.isAbsolute(projectRoot)) {
        return {
          success: false,
          userFeedback: `Project root must be absolute: ${projectRoot}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Path must be absolute',
            providedPath: projectRoot,
          },
        };
      }

      // Check if project root exists
      try {
        const stats = await fs.stat(projectRoot);
        if (!stats.isDirectory()) {
          return {
            success: false,
            userFeedback: `Project root is not a directory: ${projectRoot}`,
            previewRefreshNeeded: false,
            technicalDetails: {
              error: 'Path is not a directory',
              path: projectRoot,
            },
          };
        }
      } catch (error) {
        return {
          success: false,
          userFeedback: `Project root not found: ${projectRoot}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Directory not found',
            path: projectRoot,
          },
        };
      }

      // Define asset directories
      const assetDirs = {
        images: asset_structure.images || 'assets/images',
        fonts: asset_structure.fonts || 'assets/fonts',
        icons: asset_structure.icons || 'assets/icons',
        videos: asset_structure.videos || 'assets/videos',
      };

      // Create asset directories
      for (const [, dir] of Object.entries(assetDirs)) {
        const fullPath = path.join(projectRoot, dir);
        await fs.mkdir(fullPath, { recursive: true });
      }

      // Find and categorize assets
      const assetFiles: { [key: string]: string[] } = {
        images: [],
        fonts: [],
        icons: [],
        videos: [],
      };

      const assetExtensions = {
        images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'],
        fonts: ['.woff', '.woff2', '.ttf', '.otf', '.eot'],
        icons: ['.ico', '.svg'],
        videos: ['.mp4', '.webm', '.ogg', '.avi', '.mov'],
      };

      async function findAssets(dir: string) {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            // Skip asset directories and common ignored directories
            const relativePath = path.relative(projectRoot, fullPath);
            if (
              Object.values(assetDirs).includes(relativePath) ||
              ['node_modules', '.git', 'dist', 'build', '.next'].includes(
                entry.name
              )
            ) {
              continue;
            }
            await findAssets(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();

            // Categorize by extension
            for (const [category, extensions] of Object.entries(
              assetExtensions
            )) {
              if (extensions.includes(ext)) {
                // Special handling for icons (SVG files in icon-like directories)
                if (category === 'icons' && ext === '.svg') {
                  const dirName = path
                    .basename(path.dirname(fullPath))
                    .toLowerCase();
                  if (
                    dirName.includes('icon') ||
                    dirName.includes('ico') ||
                    entry.name.includes('icon')
                  ) {
                    assetFiles.icons.push(fullPath);
                  } else {
                    assetFiles.images.push(fullPath);
                  }
                } else if (category !== 'icons' || ext !== '.svg') {
                  assetFiles[category].push(fullPath);
                }
                break;
              }
            }
          }
        }
      }

      await findAssets(projectRoot);

      // Move assets and track changes
      const movedFiles: Array<{ from: string; to: string }> = [];
      const updatedReferences: Array<{ file: string; changes: number }> = [];

      for (const [category, files] of Object.entries(assetFiles)) {
        const targetDir = path.join(
          projectRoot,
          assetDirs[category as keyof typeof assetDirs]
        );

        for (const filePath of files) {
          const fileName = path.basename(filePath);
          const targetPath = path.join(targetDir, fileName);

          // Skip if file is already in the correct location
          if (path.dirname(filePath) === targetDir) {
            continue;
          }

          // Handle naming conflicts
          let finalTargetPath = targetPath;
          let counter = 1;
          while (
            await fs
              .access(finalTargetPath)
              .then(() => true)
              .catch(() => false)
          ) {
            const ext = path.extname(fileName);
            const baseName = path.basename(fileName, ext);
            finalTargetPath = path.join(
              targetDir,
              `${baseName}_${counter}${ext}`
            );
            counter++;
          }

          // Move file
          await fs.rename(filePath, finalTargetPath);
          movedFiles.push({
            from: path.relative(projectRoot, filePath),
            to: path.relative(projectRoot, finalTargetPath),
          });

          // Update references if requested
          if (update_references) {
            const references = await updateFileReferences(
              filePath,
              finalTargetPath,
              projectRoot
            );
            updatedReferences.push(...references);
          }
        }
      }

      const totalMoved = movedFiles.length;
      const totalReferences = updatedReferences.reduce(
        (sum, ref) => sum + ref.changes,
        0
      );

      let resultMessage = 'Asset organization complete:\n';
      resultMessage += `• Moved ${totalMoved} asset files\n`;
      if (update_references) {
        resultMessage += `• Updated ${totalReferences} file references in ${updatedReferences.length} files\n`;
      }
      resultMessage += '\nAsset structure:\n';
      Object.entries(assetDirs).forEach(([type, dir]) => {
        const count = assetFiles[type].length;
        if (count > 0) {
          resultMessage += `• ${dir}: ${count} ${type}\n`;
        }
      });

      const userMessage = `Organized ${totalMoved} assets${update_references ? ` and updated ${totalReferences} references` : ''}`;

      return {
        success: true,
        data: {
          organization: {
            movedFiles,
            updatedReferences,
          },
          assetCounts: Object.fromEntries(
            Object.entries(assetFiles).map(([type, files]) => [
              type,
              files.length,
            ])
          ),
          assetDirectories: assetDirs,
        },
        userFeedback: userMessage,
        previewRefreshNeeded: true,
        changedFiles: [
          ...movedFiles.map(f => path.join(projectRoot, f.to)),
          ...updatedReferences.map(f => path.join(projectRoot, f.file)),
        ],
        technicalDetails: {
          organization: { movedFiles, updatedReferences },
          assetDirectories: assetDirs,
          formattedResults: resultMessage.trim(),
        },
      };
    } catch (error) {
      logger.error('Error organizing assets', {
        error: error instanceof Error ? error.message : String(error),
        toolCallId: context.toolCallId,
      });

      return {
        success: false,
        userFeedback: 'Failed to organize assets',
        previewRefreshNeeded: false,
        technicalDetails: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },

  estimatedDuration: 8000,
  metadata: {
    version: '1.0.0',
    tags: ['assets', 'organization', 'file-management', 'references'],
    examples: [
      {
        description: 'Organize assets with default structure',
        input: {
          project_root: '/home/user/project',
          update_references: true,
        },
      },
      {
        description: 'Organize with custom asset structure',
        input: {
          project_root: '/home/user/project',
          asset_structure: {
            images: 'public/images',
            fonts: 'public/fonts',
            icons: 'public/icons',
          },
          update_references: true,
        },
      },
    ],
  },
};

/**
 * Tool for running build tools and asset processing
 */
const runBuildToolTool: EnhancedToolDefinition = {
  name: 'run_build_tool',
  displayName: 'RunBuildTool',
  description:
    'Runs build tools and asset processing commands like npm scripts, webpack, vite, or other build systems. Executes commands in a sandboxed environment.',
  userDescription: 'run build tools and asset processing commands',
  category: ToolCategory.ASSET_MANAGEMENT,
  safetyLevel: 'potentially_destructive',
  inputSchema: z.object({
    command: z
      .string()
      .describe(
        'The build command to run (e.g., "npm run build", "vite build")'
      ),
    working_directory: z
      .string()
      .describe('The absolute path to the working directory'),
    timeout: z
      .number()
      .optional()
      .describe('Timeout in seconds (default: 300)'),
    env_vars: z
      .record(z.string(), z.string())
      .optional()
      .describe('Environment variables to set'),
  }),

  async execute(
    input: {
      command: string;
      working_directory: string;
      timeout?: number;
      env_vars?: Record<string, string>;
    },
    context: ToolExecutionContext
  ) {
    try {
      const {
        command,
        working_directory: workingDir,
        timeout = 300,
        env_vars = {},
      } = input;

      logger.info('Build tool execution requested', {
        command,
        workingDir,
        timeout,
        envVars: Object.keys(env_vars),
        toolCallId: context.toolCallId,
      });

      // Validate working directory
      if (!path.isAbsolute(workingDir)) {
        return {
          success: false,
          userFeedback: `Working directory must be absolute: ${workingDir}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Path must be absolute',
            providedPath: workingDir,
          },
        };
      }

      // Check if working directory exists
      try {
        const stats = await fs.stat(workingDir);
        if (!stats.isDirectory()) {
          return {
            success: false,
            userFeedback: `Working directory is not a directory: ${workingDir}`,
            previewRefreshNeeded: false,
            technicalDetails: {
              error: 'Path is not a directory',
              path: workingDir,
            },
          };
        }
      } catch (error) {
        return {
          success: false,
          userFeedback: `Working directory not found: ${workingDir}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Directory not found',
            path: workingDir,
          },
        };
      }

      // Validate command for security
      const dangerousCommands = ['rm -rf', 'del /f', 'format', 'fdisk', 'mkfs'];
      if (
        dangerousCommands.some(dangerous =>
          command.toLowerCase().includes(dangerous)
        )
      ) {
        return {
          success: false,
          userFeedback:
            'Command contains potentially dangerous operations and cannot be executed',
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Dangerous command blocked',
            command,
          },
        };
      }

      // Execute command
      const { exec } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const execAsync = promisify(exec);

      const startTime = Date.now();

      try {
        const result = await Promise.race([
          execAsync(command, {
            cwd: workingDir,
            env: { ...process.env, ...env_vars },
            maxBuffer: 1024 * 1024 * 10, // 10MB buffer
          }),
          new Promise<never>((_resolve, reject) =>
            setTimeout(
              () => reject(new Error('Command timeout')),
              timeout * 1000
            )
          ),
        ]);

        const executionTime = Date.now() - startTime;
        const userMessage = `Build command completed successfully in ${(executionTime / 1000).toFixed(1)}s`;

        return {
          success: true,
          data: {
            stdout: result.stdout,
            stderr: result.stderr,
            executionTime,
            command,
            workingDirectory: workingDir,
          },
          userFeedback: userMessage,
          previewRefreshNeeded: true,
          technicalDetails: {
            command,
            workingDirectory: workingDir,
            executionTime,
            stdout: result.stdout,
            stderr: result.stderr,
          },
        };
      } catch (error: any) {
        const executionTime = Date.now() - startTime;
        const isTimeout = error.message === 'Command timeout';

        return {
          success: false,
          userFeedback: isTimeout
            ? `Build command timed out after ${timeout}s`
            : `Build command failed: ${error.message}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: error.message,
            command,
            workingDirectory: workingDir,
            executionTime,
            stdout: error.stdout || '',
            stderr: error.stderr || '',
            isTimeout,
          },
        };
      }
    } catch (error) {
      logger.error('Error running build tool', {
        error: error instanceof Error ? error.message : String(error),
        toolCallId: context.toolCallId,
      });

      return {
        success: false,
        userFeedback: 'Failed to run build tool',
        previewRefreshNeeded: false,
        technicalDetails: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },

  estimatedDuration: 30000,
  metadata: {
    version: '1.0.0',
    tags: ['build', 'assets', 'processing', 'npm', 'webpack', 'vite'],
    examples: [
      {
        description: 'Run npm build script',
        input: {
          command: 'npm run build',
          working_directory: '/home/user/project',
        },
      },
      {
        description: 'Run Vite build with custom environment',
        input: {
          command: 'vite build',
          working_directory: '/home/user/project',
          env_vars: {
            NODE_ENV: 'production',
            VITE_API_URL: 'https://api.example.com',
          },
        },
      },
    ],
  },
};

/**
 * Register asset management tools
 */
export function registerAssetManagementTools() {
  try {
    toolRegistry.registerEnhancedTool(optimizeImageTool);
    toolRegistry.registerEnhancedTool(organizeAssetsTool);
    toolRegistry.registerEnhancedTool(runBuildToolTool);

    logger.info('Asset management tools registered successfully', {
      toolCount: 3,
      tools: ['optimize_image', 'organize_assets', 'run_build_tool'],
    });
  } catch (error) {
    logger.error('Failed to register asset management tools', { error });
    throw error;
  }
}
