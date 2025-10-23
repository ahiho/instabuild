# Testing Requirements

## Unit Tests

- Write tests for utilities and business logic
- Test edge cases and error conditions
- Keep tests focused and isolated

## Component Tests

- Test React components with Vitest + React Testing Library
- Test user interactions, not implementation details
- Mock external dependencies

## E2E Tests

- Critical user flows (to be implemented)
- Use Playwright or Cypress
- Focus on happy paths and critical errors

## Coverage

- Aim for 80% code coverage on new code
- Don't sacrifice test quality for coverage numbers
- Focus on testing critical paths

## Running Tests

- Run `pnpm test` before committing
- Run `pnpm type-check` to catch type errors
- Ensure all tests pass in CI/CD pipeline

## Test Structure

- Arrange-Act-Assert pattern
- Descriptive test names
- One assertion per test when possible
- Use test fixtures for complex data
