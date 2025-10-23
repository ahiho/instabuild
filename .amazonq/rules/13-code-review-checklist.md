# Code Review Checklist

Before submitting code for review, ensure:

## Type Safety

- [ ] TypeScript types are properly defined
- [ ] No `any` types without justification
- [ ] Interfaces are well-documented

## Code Quality

- [ ] Code follows naming conventions
- [ ] Functions are small and focused
- [ ] No code duplication
- [ ] Error handling is implemented

## Testing

- [ ] Tests are written and passing
- [ ] Edge cases are covered
- [ ] Test names are descriptive

## Code Cleanliness

- [ ] No console.log statements in production code
- [ ] No commented-out code
- [ ] No unused imports or variables

## Formatting & Linting

- [ ] Code is formatted with Prettier
- [ ] No ESLint errors or warnings
- [ ] Follows project style guide

## Responsive Design

- [ ] Works on mobile devices
- [ ] Works on tablets
- [ ] Works on desktop

## Accessibility

- [ ] Accessibility guidelines are followed
- [ ] ARIA labels are added where needed
- [ ] Keyboard navigation works

## Performance

- [ ] No unnecessary re-renders
- [ ] Images are optimized
- [ ] Bundle size is acceptable
- [ ] API calls are optimized
