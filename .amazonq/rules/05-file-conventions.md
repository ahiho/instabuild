# File & Folder Conventions

## File Extensions

- `.tsx` for React components
- `.ts` for utilities and services
- `.test.ts` or `.spec.ts` for test files

## Index Files

- Use `index.ts` to export multiple related items from a directory
- Keep index files clean and simple
- Re-export only public APIs

## Test Files

- Co-locate tests with the files they test
- Use `*.test.ts` or `*.spec.ts` suffix
- Mirror the structure of source files

## Environment Variables

- Use `.env.example` for documenting required variables
- **Never commit `.env` files**
- Prefix public variables with `VITE_` (frontend)
- No prefix needed for backend variables
- Keep sensitive data out of version control
