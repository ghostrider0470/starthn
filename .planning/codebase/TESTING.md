# Testing Patterns

**Analysis Date:** 2026-02-07

## Test Framework

**Runner:**
- Vitest 3.0.5
- Config: `horizon-frontend/vitest.config.ts`

**Assertion Library:**
- Vitest built-in assertions
- React Testing Library (@testing-library/react 16.2.0)

**Run Commands:**
```bash
npm run test              # Run all tests
```

**Configuration:**
```typescript
// horizon-frontend/vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@': resolve(process.cwd(), './src'),
    },
  },
})
```

## Test File Organization

**Location:**
- No test files currently present in the codebase
- Tests would be co-located with components using `.test.tsx` or `.spec.tsx` extensions (per CLAUDE.md)

**Naming:**
- Pattern: `{ComponentName}.test.tsx` or `{ComponentName}.spec.tsx`
- Example: `LoginForm.test.tsx`, `Button.test.tsx`

**Structure:**
```
horizon-frontend/src/
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   └── button.test.tsx    # Test co-located
│   ├── login-form.tsx
│   └── login-form.test.tsx    # Test co-located
```

## Test Structure

**Suite Organization:**
Expected pattern based on tooling and conventions:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Button } from './button'

describe('Button', () => {
  it('renders with default variant', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('handles click events', async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

**Patterns:**
- `describe` blocks for component/module grouping
- `it` or `test` for individual test cases
- `beforeEach`/`afterEach` for setup/teardown
- `waitFor` for async assertions

## Mocking

**Framework:** Vitest built-in mocking (`vi` utility)

**Patterns:**

**Mock functions:**
```typescript
const mockFn = vi.fn()
mockFn.mockReturnValue('mocked value')
mockFn.mockResolvedValue({ data: 'async result' })
```

**Mock modules:**
```typescript
vi.mock('@/services/auth.service', () => ({
  default: {
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: vi.fn(),
  }
}))
```

**What to Mock:**
- API calls (axios requests via services)
- TanStack Router navigation (`useNavigate`)
- TanStack Query hooks (`useQuery`, `useMutation`)
- External OAuth services
- LocalStorage operations
- File operations (blob storage)

**What NOT to Mock:**
- UI component rendering
- Component composition
- Utility functions (like `cn()`)
- Simple calculations
- Type definitions

## Fixtures and Factories

**Test Data:**
Pattern would follow factory approach for consistent test data:
```typescript
// fixtures/user.fixture.ts
export const createMockUser = (overrides = {}) => ({
  id: '123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  roles: ['Individual'],
  permissions: [],
  ...overrides,
})

export const createMockAuthResponse = (overrides = {}) => ({
  message: 'Login successful',
  token: {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  },
  ...overrides,
})
```

**Location:**
- `horizon-frontend/src/__tests__/fixtures/` or `horizon-frontend/src/fixtures/`
- Co-located with test files for component-specific fixtures

## Coverage

**Requirements:** Not enforced (no coverage configuration in vitest.config.ts)

**View Coverage:**
```bash
# Would require adding coverage configuration
npm run test -- --coverage
```

**Current Status:**
- No test coverage configured
- No coverage thresholds set
- Would need to add Vitest coverage plugin

## Test Types

**Unit Tests:**
- Scope: Individual components, hooks, services, utilities
- Approach: Isolated testing with mocked dependencies
- Example targets:
  - `horizon-frontend/src/components/ui/button.tsx` - Button variants and props
  - `horizon-frontend/src/services/auth.service.ts` - Authentication methods
  - `horizon-frontend/src/lib/utils.ts` - `cn()` utility function
  - `horizon-frontend/src/hooks/use-toast.ts` - Toast hook logic

**Integration Tests:**
- Scope: Component interactions with services and context
- Approach: Test component + real hooks + mocked API
- Example targets:
  - `horizon-frontend/src/components/login-form.tsx` with `AuthContext`
  - `horizon-frontend/src/components/datasets/DatasetsManager.tsx` with TanStack Query
  - Form submission flows with validation

**E2E Tests:**
- Framework: Not configured
- Would require additional tooling (Playwright, Cypress)

## Common Patterns

**Async Testing:**
```typescript
it('loads and displays user profile', async () => {
  const mockProfile = createMockUser()
  vi.mocked(profileService.getProfile).mockResolvedValue(mockProfile)

  render(<ProfilePage />)

  await waitFor(() => {
    expect(screen.getByText(mockProfile.firstName)).toBeInTheDocument()
  })
})
```

**Error Testing:**
```typescript
it('displays error message on login failure', async () => {
  const errorMessage = 'Invalid credentials'
  vi.mocked(authService.login).mockRejectedValue({
    response: { data: { message: errorMessage } }
  })

  render(<LoginForm />)

  fireEvent.click(screen.getByRole('button', { name: /login/i }))

  await waitFor(() => {
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })
})
```

**Testing with TanStack Query:**
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

const renderWithQueryClient = (component: React.ReactElement) => {
  const testQueryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={testQueryClient}>
      {component}
    </QueryClientProvider>
  )
}

it('fetches and displays datasets', async () => {
  vi.mocked(blobService.getUserDatasets).mockResolvedValue([
    { id: '1', name: 'test.csv', size: 1024, uploadedAt: new Date() }
  ])

  renderWithQueryClient(<DatasetsManager />)

  await waitFor(() => {
    expect(screen.getByText('test.csv')).toBeInTheDocument()
  })
})
```

**Testing with Router:**
```typescript
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'

const renderWithRouter = (initialPath = '/') => {
  const history = createMemoryHistory({ initialEntries: [initialPath] })
  const router = createRouter({ routeTree, history })

  return render(<RouterProvider router={router} />)
}

it('navigates to dashboard after login', async () => {
  renderWithRouter('/login')

  // Perform login actions
  // Assert navigation occurred
})
```

**Testing Context Providers:**
```typescript
import { AuthProvider } from '@/contexts/AuthContext'

const renderWithAuth = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <AuthProvider>
        {component}
      </AuthProvider>
    </QueryClientProvider>
  )
}
```

## Testing Setup Requirements

**Dependencies Installed:**
- `vitest` - Test runner
- `@testing-library/react` - React testing utilities
- `@testing-library/dom` - DOM testing utilities
- `jsdom` - DOM environment for Node

**Missing Test Infrastructure:**
- No existing test files
- No test utilities/helpers directory
- No fixture factories
- No coverage configuration
- No CI test integration visible

**Recommended Test Priority (based on codebase analysis):**
1. **High Priority:**
   - `horizon-frontend/src/services/auth.service.ts` - Critical authentication logic
   - `horizon-frontend/src/components/login-form.tsx` - Core user flow
   - `horizon-frontend/src/components/register-form.tsx` - User registration
   - `horizon-frontend/src/contexts/AuthContext.tsx` - Global auth state
   - `horizon-frontend/src/services/api.ts` - API interceptors

2. **Medium Priority:**
   - `horizon-frontend/src/components/datasets/DatasetsManager.tsx` - Data management
   - `horizon-frontend/src/components/ui/button.tsx` - Reusable UI component
   - `horizon-frontend/src/hooks/use-toast.ts` - Toast notification system
   - `horizon-frontend/src/lib/utils.ts` - Utility functions

3. **Low Priority:**
   - Landing page components
   - Innovation lab components
   - Visual/animation components

---

*Testing analysis: 2026-02-07*
