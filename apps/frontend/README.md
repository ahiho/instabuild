# InstaBuild Frontend

React-based TypeScript frontend application for the InstaBuild platform.

## Features

- **React 18**: Modern React with hooks
- **TypeScript**: Full type safety
- **Vite**: Fast development and optimized builds
- **Shared Types**: Type-safe communication with backend
- **Hot Reload**: Instant development feedback

## Development

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Run tests
pnpm test

# Lint code
pnpm lint
```

## Project Structure

```
src/
├── main.tsx          # Application entry point
├── App.tsx           # Root component
├── components/       # Reusable UI components
│   └── Health.tsx    # Health check component
├── pages/            # Route-level components
├── services/         # API calls and business logic
└── lib/              # Utilities
```

## Adding New Components

1. Create component file in `src/components/`
2. Use TypeScript for props and state
3. Import shared types from `@instabuild/shared`
4. Export component for use in pages

Example:

```typescript
// src/components/UserList.tsx
import { FC } from 'react';
import { User } from '@instabuild/shared';

interface UserListProps {
  users: User[];
}

export const UserList: FC<UserListProps> = ({ users }) => {
  return (
    <div>
      {users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
};
```

## API Integration

Use the shared types for type-safe API calls:

```typescript
import { ApiResponse, User } from '@instabuild/shared';

const fetchUsers = async (): Promise<User[]> => {
  const response = await fetch('/api/users');
  const data: ApiResponse<User[]> = await response.json();
  return data.success ? data.data || [] : [];
};
```
