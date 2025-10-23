# InstaBuild Development Rules

This directory contains comprehensive development rules and guidelines for the InstaBuild AI Landing Page Builder project.

## Quick Reference

### Task Tracking



### Design System Colors

- Background: `#0a0e27` (dark navy)
- Primary: Black (`#000000`)
- Text: White (`#ffffff`)
- Muted: Gray tones (`gray-300`, `gray-400`, `gray-500`)
- Accents: Use sparingly, primarily white

### Common Commands

```bash
pnpm dev              # Start dev servers
pnpm build            # Build all packages
pnpm test             # Run tests
pnpm type-check       # Check TypeScript
pnpm lint:fix         # Fix linting issues
pnpm format           # Format code
```

### Project Structure

```
/apps/frontend        # React + Vite app
/apps/backend         # Node.js + Express API
/packages/shared      # Shared types and utilities
/.claude              # Claude AI configuration
/.amazonq             # Amazon Q configuration
/specs                # Feature specifications
```

## Rules Index

1. [Code Style & Quality](./01-code-style.md) - TypeScript, naming conventions, error handling
2. [Architecture & Project Structure](./02-architecture.md) - Monorepo organization, component structure
3. [UI/UX Design Rules](./03-ui-ux-design.md) - Dark mode, minimalist black styling, accessibility
4. [Technology Stack](./04-technology-stack.md) - Frontend and backend technologies
5. [File & Folder Conventions](./05-file-conventions.md) - Extensions, test files, env variables
6. [Git Workflow](./06-git-workflow.md) - Branch naming, commit messages, PR requirements
7. [Testing Requirements](./07-testing.md) - Unit tests, component tests, coverage
8. [Performance Guidelines](./08-performance.md) - Bundle optimization, Three.js best practices
9. [Security Best Practices](./09-security.md) - Input validation, XSS protection, rate limiting
10. [Development Workflow](./10-development-workflow.md) - pnpm scripts, pre-commit hooks
11. [AI-Specific Guidelines](./11-ai-guidelines.md) - Prompt engineering, token management
12. [Documentation Standards](./12-documentation.md) - README, API docs, architecture decisions
13. [Code Review Checklist](./13-code-review-checklist.md) - Quality checklist before submitting
14. [Dependencies Management](./14-dependencies.md) - Version pinning, security audits
15. [Environment-Specific Rules](./15-environments.md) - Dev, staging, production configurations

## Project Overview

InstaBuild is an AI-powered landing page builder using React, Node.js, and Three.js for creating beautiful, conversion-focused landing pages.

### Key Principles

- Dark mode only (no light variant)
- Minimalist black styling with no gradients
- TypeScript first with strict typing
- Functional React components with hooks
- pnpm workspace monorepo structure
- Test-driven development with 80% coverage target
