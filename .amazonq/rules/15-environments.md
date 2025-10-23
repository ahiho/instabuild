# Environment-Specific Rules

## Development

- Enable verbose logging and debugging tools
- Use development API endpoints
- Hot module replacement enabled
- Source maps enabled
- Mock external services when needed
- Fast refresh enabled

## Staging

- Mirror production configuration
- Use staging API endpoints
- Test with production-like data
- Enable performance monitoring
- Test deployment process
- Validate integrations

## Production

- Minimize bundle size
- Enable all optimizations
- Disable source maps for security
- Use production API endpoints
- Enable error tracking (e.g., Sentry)
- Configure CDN caching
- Enable security headers
- Rate limiting enabled
- Monitor performance metrics

## Environment Variables

```bash
# Development
VITE_API_URL=http://localhost:3000
VITE_ENV=development

# Staging
VITE_API_URL=https://staging-api.instabuild.com
VITE_ENV=staging

# Production
VITE_API_URL=https://api.instabuild.com
VITE_ENV=production
```
