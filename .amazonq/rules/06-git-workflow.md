# Git Workflow

## Branch Naming

- **Feature**: `feature/description` or `###-description` (e.g., `004-home-page-overhaul`)
- **Bug fix**: `fix/description`
- **Hotfix**: `hotfix/description`

## Commit Messages

- **Format**: `type(scope): description`
- **Types**: feat, fix, docs, style, refactor, test, chore
- **Example**: `feat(hero): add particle background animation`
- Keep first line under 72 characters
- Use imperative mood ("add" not "added")

## Pull Requests

- Write descriptive title and summary
- Include test plan
- Reference related issues
- Request reviews from team members
- Ensure CI passes before merging

## Best Practices

- Commit frequently with logical chunks
- Keep commits atomic and focused
- Write meaningful commit messages
- Rebase feature branches before merging
- Squash commits when appropriate
