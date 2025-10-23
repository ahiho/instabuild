# Code Style & Quality

## TypeScript First

- All code must be written in TypeScript with strict typing
- No `any` types unless absolutely necessary

## Functional Components

- Use React functional components with hooks only
- No class components

## Async/Await

- Prefer async/await over promises for better readability
- Always handle promise rejections

## Error Handling

- Always handle errors gracefully with try/catch blocks
- Log errors appropriately
- Provide user-friendly error messages

## Code Comments

- Add JSDoc comments for functions, complex logic, and type definitions
- Explain the "why", not the "what"

## Naming Conventions

- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Functions/Variables**: camelCase (e.g., `getUserData`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)
- **Types/Interfaces**: PascalCase with descriptive names (e.g., `UserProfileProps`)
