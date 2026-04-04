# Coding Conventions

**Analysis Date:** 2026-02-07

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `LoginForm`, `DatasetsManager.tsx`)
- Routes: kebab-case (e.g., `forgot-password.tsx`, `reset-password.tsx`)
- Services: camelCase with `.service.ts` suffix (e.g., `auth.service.ts`, `profile.service.ts`)
- Hooks: camelCase with `use` prefix (e.g., `useToast`, `useCRTEffect.ts`, `useScrollSections.ts`)
- Utils/lib: kebab-case or camelCase (e.g., `auth-guards.ts`, `utils.ts`)
- UI components: kebab-case in `/components/ui/` (e.g., `button.tsx`, `dropdown-menu.tsx`)

**Functions:**
- React components: PascalCase (`LoginForm`, `Button`, `DatasetsManager`)
- Regular functions: camelCase (`cn`, `genId`, `toast`)
- Service methods: camelCase (`login`, `register`, `getProfile`)
- Async functions: camelCase with `async` keyword (`async login()`, `async handleSubmit()`)

**Variables:**
- Local state: camelCase (`email`, `password`, `isLoading`, `showPassword`)
- Constants: SCREAMING_SNAKE_CASE for top-level constants (`API_BASE_URL`, `TOAST_LIMIT`, `TOAST_REMOVE_DELAY`)
- Boolean flags: prefix with `is`, `has`, `should` (e.g., `isLoading`, `isAuthenticated`, `hasRole`)

**Types:**
- Interfaces: PascalCase (`AuthContextType`, `ProfileData`, `LoginDto`)
- Type aliases: PascalCase (`User`, `TokenDto`, `RegisterDto`)
- DTOs: PascalCase with `Dto` suffix (`LoginDto`, `RegisterDto`, `Enable2FADto`)
- Service responses: PascalCase with `Response` suffix (`AuthResponse`, `TwoFactorSetupResponse`)

## Code Style

**Formatting:**
- Prettier with configuration in `horizon-frontend/prettier.config.js`
- No semicolons (`semi: false`)
- Single quotes (`singleQuote: true`)
- Trailing commas (`trailingComma: 'all'`)

**Linting:**
- ESLint with TanStack config (`horizon-frontend/eslint.config.js`)
- Configuration: `import { tanstackConfig } from '@tanstack/eslint-config'`
- Run commands: `npm run lint` (check), `npm run check` (format and fix)

**TypeScript:**
- Non-strict mode (`strict: false` in `tsconfig.json`)
- `noImplicitAny: false`, `noUnusedLocals: false`, `noUnusedParameters: false`
- Target: ES2022, JSX: react-jsx
- Path aliases enabled: `@/*` maps to `src/*`

## Import Organization

**Order:**
1. External libraries (React, third-party packages)
2. TanStack imports (Router, Query, Form)
3. UI components from `@/components/ui/`
4. Local components and layouts
5. Services and contexts
6. Hooks and utilities
7. Types (when imported separately)

**Example from `horizon-frontend/src/components/login-form.tsx`:**
```typescript
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import oauthService from '@/services/oauth.service'
import { TwoFactorVerification } from '@/components/TwoFactorVerification'
```

**Path Aliases:**
- `@/*` for all src imports
- Always use alias over relative paths when importing from src

## Error Handling

**Patterns:**

**Try-catch with error typing:**
```typescript
try {
  await login({ email, password })
  navigate({ to: '/dashboard' })
} catch (err: any) {
  if (err?.response?.data?.message === '2FA_REQUIRED') {
    setRequires2FA(true)
  } else {
    setLocalError(err?.response?.data?.message || error || 'Login failed')
  }
}
```

**Mutation error handling (TanStack Query):**
```typescript
const uploadMutation = useMutation({
  mutationFn: blobService.uploadDataset,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['user-datasets'] })
    toast({ title: 'Success', description: 'Dataset uploaded successfully' })
  },
  onError: (error) => {
    toast({
      title: 'Upload failed',
      description: error instanceof Error ? error.message : 'Failed to upload dataset',
      variant: 'destructive',
    })
  },
})
```

**Service layer error handling:**
```typescript
async logout(): Promise<void> {
  try {
    await api.post('/auth/revoke-token');
  } catch (error) {
    console.error('Failed to revoke token:', error);
  } finally {
    this.clearTokens();
  }
}
```

**Context-level error validation:**
```typescript
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

## Logging

**Framework:** Console methods (built-in)

**Patterns:**
- Use `console.error()` for error logging in catch blocks
- Use `console.log()` for debugging (present in development, but should be removed in production code)
- Use `console.warn()` for non-critical issues (e.g., failed optional data loads)

**Examples from codebase:**
- Error logging: `console.error('Failed to decode token:', error)` in `horizon-frontend/src/services/auth.service.ts:198`
- Debug logging: `console.log('2FA Success handler called')` in `horizon-frontend/src/components/login-form.tsx:65`
- Warning logging: `console.warn('Failed to load continent coastline data:', error)` in `horizon-frontend/src/data/globe/geometry/loaders.ts:99`

## Comments

**When to Comment:**
- Complex business logic requiring explanation
- Workarounds or temporary solutions
- Public API documentation (service methods, exported utilities)
- Non-obvious code behavior

**JSDoc/TSDoc:**
- Used sparingly, primarily for deprecated methods
- Example: `/** @deprecated Use RegisterDto instead */` in `horizon-frontend/src/services/auth.service.ts:23`

**Inline comments:**
- Short explanations for non-obvious code
- Example: `// Check if user needs to complete first-time setup` in `horizon-frontend/src/components/login-form.tsx:36`
- Example: `// Recovery codes are in format XXXXX-XXXXX (11 chars with dash)` in `horizon-frontend/src/components/TwoFactorVerification.tsx:25`

## Function Design

**Size:**
- Components: 100-400 lines typical, with complex forms reaching 400+ lines
- Service methods: 10-30 lines
- Utility functions: 5-20 lines
- Hook implementations: 50-200 lines for complex hooks

**Parameters:**
- React component props: Use `React.ComponentProps<'element'>` pattern with intersections
- Example from `horizon-frontend/src/components/ui/button.tsx`:
```typescript
function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  })
```

**Return Values:**
- Explicit Promise types for async functions
- Type inference for most other functions
- Hooks return objects with named properties

## Module Design

**Exports:**
- Named exports preferred for components: `export function LoginForm() {}`
- Default exports for services: `export default new AuthService()`
- Route files use TanStack Router's pattern: `export const Route = createFileRoute('/')({...})`

**Barrel Files:**
- Not used extensively
- UI components imported individually: `import { Button } from '@/components/ui/button'`

## State Management

**Local State:**
- `useState` for component-local state
- Multiple state variables over complex state objects
- Example from `horizon-frontend/src/components/login-form.tsx`:
```typescript
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [isLoading, setIsLoading] = useState(false)
const [showPassword, setShowPassword] = useState(false)
```

**Server State:**
- TanStack Query for all server data
- Mutations for write operations
- Query invalidation for cache management

**Context:**
- React Context for global state (auth, theme)
- Custom hooks to access context (`useAuth()`, `useToast()`)

## Form Handling

**Pattern:**
- Controlled components with `useState`
- Form submission with `onSubmit` handler and `e.preventDefault()`
- Validation in submit handler before API call
- Loading states during submission
- Error states for validation and API errors

**Example from `horizon-frontend/src/components/register-form.tsx`:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setValidationError(null)

  if (formData.password !== formData.confirmPassword) {
    setValidationError('Passwords do not match')
    return
  }

  setIsLoading(true)
  try {
    await register({ ...formData })
    setRegistrationSuccess(true)
  } catch (err) {
    // Error handled in context
  } finally {
    setIsLoading(false)
  }
}
```

## Styling

**Approach:**
- Tailwind CSS v4 utility classes
- `cn()` utility from `horizon-frontend/src/lib/utils.ts` for conditional classes
- Class Variance Authority (CVA) for component variants

**Example from `horizon-frontend/src/components/ui/button.tsx`:**
```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        destructive: 'bg-destructive text-white shadow-xs hover:bg-destructive/90',
        outline: 'border bg-background shadow-xs hover:bg-accent',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md gap-1.5 px-3',
        lg: 'h-10 rounded-md px-6',
      },
    },
  },
)
```

---

*Convention analysis: 2026-02-07*
