# Dependencies Management

## Adding Dependencies

- Use `pnpm add <package>` in the appropriate workspace
- Document why the dependency is needed
- Prefer smaller, focused libraries over large frameworks
- Check bundle size impact before adding
- Review security and maintenance status

## Version Pinning

- Pin versions in package.json to avoid breaking changes
- Use exact versions for production dependencies
- Allow patch updates for dev dependencies
- Test version updates in staging first

## Security

- Regularly run `pnpm audit` and fix vulnerabilities
- Update dependencies monthly
- Subscribe to security advisories
- Use Dependabot or Renovate for automated updates

## Bundle Analysis

- Use `vite-bundle-visualizer` to analyze bundle size
- Identify large dependencies
- Consider alternatives for bloated packages
- Use tree-shaking where possible
- Split vendor bundles strategically

## Workspace Dependencies

- Use workspace protocol for internal packages
- Keep shared dependencies consistent
- Hoist common dependencies to root
- Document cross-package dependencies
