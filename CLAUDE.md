# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
npm run dev          # Start dev server on port 3000
npm start            # Alternative dev command

# Build & Preview
npm run build        # Production build with TypeScript checking
npm run serve        # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run format       # Run Prettier
npm run check        # Format and fix all code issues

# Testing
npm run test         # Run tests with Vitest
```

## Architecture Overview

This is a modern React application built with the TanStack ecosystem:

- **Routing**: File-based routing via TanStack Router. Routes are in `src/routes/` and automatically generate a route tree. The `__root.tsx` provides the root layout.
- **State Management**: TanStack Query for server state, TanStack Form for forms with Zod validation
- **Styling**: Tailwind CSS v4 with utility classes
- **Type Safety**: Full TypeScript with strict mode, Zod schemas for runtime validation, type-safe environment variables via T3 Env

## Key Patterns

### Creating New Routes

Add files to `src/routes/` following the naming convention. Routes prefixed with `demo.` are examples that can be deleted.

### Forms

Use TanStack Form with Zod validation:

```tsx
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
```

### Component Structure

- Reusable components go in `src/components/`
- Use Tailwind classes for styling
- Create styled, reusable components following existing patterns

### Environment Variables

- Define in `src/env.ts` with Zod schemas
- Client variables must start with `VITE_`
- Access via the validated env object

### Path Imports

Use `@/` alias for src directory imports:

```tsx
import { Header } from '@/components/Header'
```

## Testing

Tests use Vitest with React Testing Library. Test files should be colocated with components using `.test.tsx` extension.
