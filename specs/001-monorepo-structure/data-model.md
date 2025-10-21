# Data Model: Monorepo Structure

**Feature**: Monorepo Structure  
**Date**: 2025-10-21  
**Status**: Complete

## Configuration Entities

### WorkspaceConfig

Configuration for pnpm workspace setup.

**Fields**:

- `packages`: Array of workspace patterns (apps/_, packages/_)
- `packageManager`: Package manager specification (pnpm@latest)

**Relationships**: Root-level configuration that defines all workspace packages

**Validation Rules**:

- Must include apps/_ and packages/_ patterns
- Package manager must be pnpm

### PackageConfig

Individual package configuration within workspace.

**Fields**:

- `name`: Package name with scope (@instabuild/\*)
- `version`: Semantic version (0.1.0)
- `type`: Package type (module for ESM)
- `scripts`: Build, test, and development scripts
- `dependencies`: External dependencies
- `devDependencies`: Development dependencies
- `workspaceDependencies`: Internal workspace dependencies

**Relationships**:

- Belongs to WorkspaceConfig
- Can depend on other PackageConfig instances

**Validation Rules**:

- Name must follow @instabuild/\* pattern
- Version must be valid semver
- Workspace dependencies must use workspace protocol

### TypeScriptConfig

TypeScript configuration for type checking and compilation.

**Fields**:

- `extends`: Base configuration path
- `compilerOptions`: Compiler settings
- `include`: Files to include in compilation
- `exclude`: Files to exclude from compilation

**Relationships**:

- Root config extended by package configs
- Enables cross-package type checking

**Validation Rules**:

- Must enable strict mode
- Must support ESM modules
- Package configs must extend root config

### ESLintConfig

ESLint configuration for code quality enforcement.

**Fields**:

- `extends`: Base configurations and plugins
- `rules`: Linting rules
- `overrides`: File-specific rule overrides
- `parserOptions`: Parser configuration for TypeScript

**Relationships**:

- Root config inherited by all packages
- Can be overridden at package level

**Validation Rules**:

- Must include TypeScript parser
- Must enforce consistent code style
- Package overrides must be justified

### PrettierConfig

Prettier configuration for code formatting.

**Fields**:

- `semi`: Semicolon usage (true)
- `singleQuote`: Quote style (true)
- `tabWidth`: Indentation width (2)
- `trailingComma`: Trailing comma style (es5)

**Relationships**:

- Root config used by all packages
- Integrated with ESLint config

**Validation Rules**:

- Must be consistent across all packages
- Must integrate with ESLint rules

## File System Entities

### DirectoryStructure

Hierarchical organization of monorepo files and folders.

**Fields**:

- `path`: Absolute path from repository root
- `type`: Directory type (app, package, config, test)
- `purpose`: Description of directory purpose
- `children`: Nested directories and files

**Relationships**:

- Root contains apps/ and packages/ directories
- Each app/package contains src/ and tests/ directories

**State Transitions**:

- Created → Populated → Configured → Ready

**Validation Rules**:

- Apps must be in apps/ directory
- Packages must be in packages/ directory
- Each package must have src/ and tests/ directories

## Build Entities

### BuildTarget

Compilation and bundling configuration for packages.

**Fields**:

- `input`: Entry point files
- `output`: Output directory and format
- `target`: Target environment (node, browser)
- `optimization`: Build optimization settings

**Relationships**:

- Each package has one or more build targets
- Backend targets Node.js, frontend targets browser

**Validation Rules**:

- Backend must target Node.js ESM
- Frontend must target modern browsers
- Output must not conflict between packages
