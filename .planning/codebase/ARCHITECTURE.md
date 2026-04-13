# Architecture

**Analysis Date:** 2026-02-07

## Pattern Overview

**Overall:** Modern React SPA with file-based routing

**Key Characteristics:**
- Declarative UI with React 19 and functional components
- Server state managed separately from UI state via TanStack Query
- File-based routing with automatic code splitting
- Token-based authentication with automatic refresh
- Component composition through Radix UI primitives and shadcn/ui

## Layers

**Presentation Layer:**
- Purpose: UI components and user interactions
- Location: `src/components/`, `src/routes/`
- Contains: React components, route definitions, UI primitives
- Depends on: Services layer, Context layer, Hooks
- Used by: Entry point (main.tsx)

**Routing Layer:**
- Purpose: File-based navigation and route management
- Location: `src/routes/`, `src/routeTree.gen.ts`
- Contains: Route components, route guards, navigation logic
- Depends on: TanStack Router, Presentation layer
- Used by: Router instance in main.tsx
- Pattern: Each `.tsx` file in `src/routes/` becomes a route, with folders creating nested routes

**Service Layer:**
- Purpose: External API communication and business logic
- Location: `src/services/`
- Contains: API client configuration, service classes, DTOs
- Depends on: Axios instance, environment configuration
- Used by: Context layer, Route components

**Context Layer:**
- Purpose: Global state management and cross-cutting concerns
- Location: `src/contexts/`
- Contains: React Context providers (Auth)
- Depends on: Services layer, TanStack Query
- Used by: Components via custom hooks (useAuth)

**Integration Layer:**
- Purpose: Third-party library configuration
- Location: `src/integrations/`
- Contains: TanStack Query setup, provider configuration
- Depends on: TanStack Query library
- Used by: Main entry point

**Utility Layer:**
- Purpose: Reusable helpers and pure functions
- Location: `src/lib/`, `src/utils/`, `src/hooks/`
- Contains: CSS utilities, auth guards, custom hooks
- Depends on: None (or minimal dependencies)
- Used by: All other layers

**Data Layer:**
- Purpose: Static data and configuration
- Location: `src/data/`, `src/config/`
- Contains: Globe data, markers, constants, section configurations
- Depends on: None
- Used by: Components requiring static data

## Data Flow

**Authentication Flow:**

1. User submits credentials via login form (`src/routes/login.tsx`)
2. Form calls `useAuth().login()` from AuthContext
3. AuthContext triggers mutation calling `authService.login()`
4. `authService` makes POST to `/auth/login` via axios instance
5. On success, tokens saved to localStorage
6. TanStack Query invalidates `userProfile` query
7. Profile data fetched from `/profile` endpoint
8. AuthContext updates with full profile data
9. Components re-render with authenticated state

**Authenticated API Request Flow:**

1. Component calls service method (e.g., `profileService.getProfile()`)
2. Service uses axios instance from `src/services/api.ts`
3. Request interceptor adds `Authorization: Bearer {token}` header from localStorage
4. Request sent to backend API
5. If 401 response, response interceptor triggers token refresh
6. Refresh token sent to `/auth/refresh-token`
7. New tokens saved to localStorage
8. Original request retried with new token
9. On refresh failure, user redirected to `/login`

**Route Navigation Flow:**

1. User clicks navigation link or URL changes
2. TanStack Router matches URL to route tree
3. Router checks route's `beforeLoad` guard if present
4. Guard validates authentication via `authService.isAuthenticated()`
5. If unauthorized, redirect to `/login` or `/unauthorized`
6. If authorized, route component loads (with preloading on intent)
7. Route component renders with layout from `__root.tsx`
8. Outlet in root renders matched route's content

**State Management:**

- **Server State:** TanStack Query with 5-minute stale time for profiles, cache invalidation on mutations
- **Authentication State:** AuthContext with localStorage persistence, automatic token refresh
- **UI State:** Local component state via useState, custom hooks for complex UI logic
- **Form State:** TanStack Form with field-level validation via Zod schemas
- **Theme State:** ThemeProvider with localStorage persistence (`horizon-tech-theme` key)

## Key Abstractions

**Route Definition:**
- Purpose: Declarative routing with type safety
- Examples: `src/routes/index.tsx`, `src/routes/profile.tsx`, `src/routes/admin/index.tsx`
- Pattern: Export `Route` created via `createFileRoute(path)` with component property

**Service Class:**
- Purpose: Encapsulate API communication logic
- Examples: `src/services/auth.service.ts`, `src/services/profile.service.ts`
- Pattern: Class with async methods returning typed responses, singleton instance exported

**Protected Routes:**
- Purpose: Authorization guards for authenticated-only content
- Examples: `src/components/ProtectedRoute.tsx`, `src/utils/auth-guards.ts`
- Pattern: Component wrapper checking `isAuthenticated`, role/permission validation, redirect on failure

**UI Components:**
- Purpose: Reusable styled components following design system
- Examples: `src/components/ui/button.tsx`, `src/components/ui/card.tsx` (30 total components)
- Pattern: Radix UI primitives wrapped with Tailwind styling, class-variance-authority for variants

**Custom Hooks:**
- Purpose: Reusable stateful logic
- Examples: `src/hooks/useAuth.ts`, `src/hooks/useCRTEffect.ts`, `src/hooks/useScrollSections.ts`
- Pattern: Extract component logic into composable functions returning state/handlers

**Feature Components:**
- Purpose: Complex feature-specific UI
- Examples: `src/components/landing/HeroSection.tsx`, `src/components/globe/GlobeVisualization.tsx`
- Pattern: Composed from UI primitives, manage local state, integrate with services

## Entry Points

**Main Application:**
- Location: `src/main.tsx`
- Triggers: Browser loads index.html
- Responsibilities: Creates router, configures providers (Theme, Query, Auth, CRTSound), renders app to DOM

**Root Layout:**
- Location: `src/routes/__root.tsx`
- Triggers: Every route navigation
- Responsibilities: Provides common layout (Navbar, Footer, CRT effects), renders route outlet, includes devtools

**Route Components:**
- Location: `src/routes/*.tsx` and subdirectories
- Triggers: URL navigation
- Responsibilities: Render page content, fetch data, handle user interactions

**API Client:**
- Location: `src/services/api.ts`
- Triggers: Any service method call
- Responsibilities: Configure base URL, add auth headers, handle token refresh, manage errors

## Error Handling

**Strategy:** Multi-level error handling with graceful degradation

**Patterns:**
- **API Errors:** Axios interceptors catch 401 (triggers refresh), other errors returned to caller
- **Authentication Errors:** Redirect to `/login`, clear tokens, show error message
- **Authorization Errors:** Redirect to `/unauthorized` page via ProtectedRoute
- **Form Validation:** Zod schemas validate on blur/submit, errors displayed inline
- **Query Errors:** TanStack Query retry logic (2 retries), error state exposed to components
- **Console Logging:** Auth errors logged for debugging, not exposed to users

## Cross-Cutting Concerns

**Logging:** Console-based during development, web vitals tracked via `reportWebVitals.ts`

**Validation:** Zod schemas for forms (TanStack Form integration) and environment variables (T3 Env)

**Authentication:** JWT tokens in localStorage, axios interceptors add auth headers globally, automatic token refresh on 401

**Theming:** System/light/dark themes via ThemeProvider, persisted to localStorage, CSS variables for colors

**Performance:** Route-based code splitting via TanStack Router plugin, manual chunks for vendors (react, router, ui), preload on intent hover

**Accessibility:** Radix UI primitives provide ARIA attributes, keyboard navigation, focus management

**Responsive Design:** Tailwind responsive utilities, mobile-specific components (MobileHeader, MobileBottomNav), performance tiers for 3D content

**3D Graphics:** Three.js with React Three Fiber, globe visualization, shaders for atmospheric effects, performance optimized by device capability

---

*Architecture analysis: 2026-02-07*
