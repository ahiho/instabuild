# Security Best Practices

## Input Validation

- Validate all user inputs on both client and server
- Use Zod schemas for validation
- Sanitize inputs to prevent XSS
- Never trust client-side validation alone

## SQL Injection Prevention

- Use Prisma parameterized queries
- Never concatenate SQL strings
- Use ORM query builders

## XSS Protection

- Sanitize user-generated content
- Use DOMPurify for HTML sanitization
- Escape special characters
- Set appropriate Content-Security-Policy headers

## CORS Configuration

- Configure CORS properly for API endpoints
- Whitelist specific origins in production
- Don't use wildcard (\*) in production

## API Keys & Secrets

- Store sensitive keys in environment variables
- Never commit secrets to version control
- Use different keys for different environments
- Rotate keys regularly

## Rate Limiting

- Implement rate limiting on API endpoints
- Protect against brute force attacks
- Use exponential backoff
- Monitor for abuse patterns
