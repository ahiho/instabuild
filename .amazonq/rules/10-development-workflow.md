# Development Workflow

## Package Manager

- Use `pnpm` exclusively (not npm or yarn)
- Version: 10.18.2 (pinned)

## Common Scripts

```bash
pnpm dev              # Start development servers
pnpm build            # Build all packages
pnpm test             # Run tests
pnpm type-check       # TypeScript type checking
pnpm lint             # Run ESLint
pnpm format           # Format code with Prettier
pnpm lint:fix         # Fix linting issues
pnpm format:check     # Check formatting
```

## Pre-commit Hooks

- Husky runs linting and formatting before commits
- Type checking runs automatically
- Tests must pass before commit
- Fix issues before committing

## Task Tracking


- Update task status as work progresses
- Document completed work
- Note any blockers or issues

## Development Environment

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Use VS Code with recommended extensions
- Enable format on save
