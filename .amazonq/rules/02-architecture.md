# Architecture & Project Structure

## Monorepo Organization

- pnpm workspace with separate apps (frontend/backend) and shared packages
- Use workspace protocol for internal dependencies

## Component Organization

- `/components/ui/` - Reusable UI components (buttons, inputs, cards)
- `/components/layout/` - Layout components (Header, Footer, Hero)
- `/components/home/` - Page-specific components
- `/pages/` - Route pages

## State Management

- Use React hooks (useState, useEffect, useContext) for local state
- Consider Zustand or Jotai for global state if needed
- Keep state as close to where it's used as possible

## API Layer

- Centralized API calls in `/services/` directory
- Use consistent error handling
- Implement request/response interceptors

## Types

- Share types via `packages/shared/src/types/`
- Keep types co-located with related code when possible
- Export types from index files
