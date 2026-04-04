# Codebase Structure

**Analysis Date:** 2026-02-07

## Directory Layout

```
horizon/
├── .planning/            # GSD planning documents
│   └── codebase/        # Codebase analysis docs
├── horizon-frontend/    # Main React application
│   ├── public/          # Static assets
│   │   └── azure/       # Azure-specific files
│   ├── src/             # Source code
│   │   ├── components/  # React components
│   │   ├── config/      # Configuration files
│   │   ├── contexts/    # React contexts
│   │   ├── data/        # Static data
│   │   ├── hooks/       # Custom React hooks
│   │   ├── integrations/ # Third-party integrations
│   │   ├── lib/         # Utility libraries
│   │   ├── routes/      # File-based routing
│   │   ├── services/    # API services
│   │   └── utils/       # Utility functions
│   ├── node_modules/    # Dependencies
│   ├── package.json     # Project dependencies
│   ├── vite.config.ts   # Vite configuration
│   ├── tsconfig.json    # TypeScript configuration
│   └── components.json  # shadcn/ui configuration
└── package.json         # Root workspace config
```

## Directory Purposes

**horizon-frontend/src/components/**
- Purpose: All React components organized by feature/type
- Contains: UI primitives, feature components, layout components
- Key subdirectories:
  - `ui/` - shadcn/ui components (30 components: button, card, dialog, etc.)
  - `landing/` - Landing page sections (HeroSection, ServicesHexGrid, etc.)
  - `layout/` - Layout components (AppHeader, PageContainer, LoadingState)
  - `globe/` - 3D globe visualization components and shaders
  - `innovation-lab/` - Innovation lab demo components (genetic algorithm, NLP)
  - `datasets/` - Dataset management components
  - `practice/` - Practice-specific components

**horizon-frontend/src/routes/**
- Purpose: File-based routing structure
- Contains: Route components that map to URLs
- Key files:
  - `__root.tsx` - Root layout wrapping all routes
  - `index.tsx` - Landing page at `/`
  - `login.tsx` - Login page at `/login`
  - `profile.tsx` - User profile at `/profile`
  - `admin/index.tsx` - Admin panel at `/admin`
  - `services/*.tsx` - Service detail pages
  - `innovation-lab/*.tsx` - Innovation lab demos
- Auto-generates: `src/routeTree.gen.ts` via TanStack Router plugin

**horizon-frontend/src/services/**
- Purpose: API integration layer
- Contains: Service classes, API client configuration, DTOs
- Key files:
  - `api.ts` - Configured axios instance with interceptors
  - `auth.service.ts` - Authentication API methods
  - `profile.service.ts` - User profile API methods
  - `oauth.service.ts` - OAuth integration
  - `blobService.ts` - Azure Blob storage
  - `fileValidation.ts` - File validation utilities

**horizon-frontend/src/contexts/**
- Purpose: React Context providers
- Contains: Global state management
- Key files:
  - `AuthContext.tsx` - Authentication state, user profile, role checks

**horizon-frontend/src/integrations/**
- Purpose: Third-party library setup
- Contains: Configuration for external libraries
- Key subdirectories:
  - `tanstack-query/` - Query client and provider setup

**horizon-frontend/src/hooks/**
- Purpose: Custom React hooks
- Contains: Reusable stateful logic (10 hooks)
- Key files:
  - `use-toast.ts` - Toast notification hook
  - `useCRTEffect.ts` - CRT screen effect hook
  - `useCRTSound.ts` - CRT sound effects provider
  - `useScrollSections.ts` - Scroll-based section tracking
  - `useAuth.ts` - Authentication hook (via AuthContext)

**horizon-frontend/src/lib/**
- Purpose: Utility libraries
- Contains: Shared utility functions
- Key files:
  - `utils.ts` - Tailwind class merging (cn function)
  - `design-system.ts` - Design system constants
  - `axios.ts` - Axios configuration helpers

**horizon-frontend/src/utils/**
- Purpose: Pure utility functions
- Contains: Helper functions without dependencies
- Key files:
  - `auth-guards.ts` - Route authorization guards

**horizon-frontend/src/data/**
- Purpose: Static data and constants
- Contains: Configuration data, mock data
- Key subdirectories:
  - `globe/` - Globe visualization data (markers, constants, geometry)

**horizon-frontend/src/config/**
- Purpose: Application configuration
- Contains: Non-environment config files
- Key files:
  - `landing-sections.ts` - Landing page section configuration

**horizon-frontend/public/**
- Purpose: Static assets served at root
- Contains: Images, icons, static files
- Key subdirectories:
  - `azure/` - Azure deployment files

## Key File Locations

**Entry Points:**
- `src/main.tsx` - Application entry, router creation, provider setup
- `src/routes/__root.tsx` - Root layout for all routes
- `public/index.html` - HTML entry point (not in src)

**Configuration:**
- `vite.config.ts` - Vite build configuration, plugins, path aliases
- `tsconfig.json` - TypeScript compiler options (non-strict mode)
- `components.json` - shadcn/ui configuration with 7 registries
- `src/env.ts` - Type-safe environment variable validation (T3 Env)
- `eslint.config.js` - ESLint configuration
- `prettier.config.js` - Prettier formatting configuration

**Core Logic:**
- `src/services/api.ts` - Axios instance with auth interceptors
- `src/services/auth.service.ts` - Authentication logic (277 lines)
- `src/contexts/AuthContext.tsx` - Auth state management (165 lines)
- `src/components/ProtectedRoute.tsx` - Route authorization component

**Testing:**
- `vitest.config.ts` - Vitest test configuration
- Test files: Colocated with components using `*.test.tsx` pattern

**Styling:**
- `src/styles.css` - Global styles and Tailwind directives
- Component styles: Inline via Tailwind utility classes

**Generated Files:**
- `src/routeTree.gen.ts` - Auto-generated route tree (24,544 bytes)

## Naming Conventions

**Files:**
- Components: PascalCase (`HeroSection.tsx`, `AuthContext.tsx`)
- Hooks: camelCase with 'use' prefix (`useAuth.ts`, `useCRTEffect.ts`)
- Services: camelCase with '.service' suffix (`auth.service.ts`, `profile.service.ts`)
- Utils: camelCase or kebab-case (`auth-guards.ts`, `utils.ts`)
- Routes: kebab-case matching URL (`forgot-password.tsx`, `confirm-email.tsx`)
- Config: kebab-case (`vite.config.ts`, `landing-sections.ts`)

**Directories:**
- kebab-case for multi-word (`innovation-lab/`, `tanstack-query/`)
- lowercase for single word (`components/`, `services/`, `hooks/`)

**Components:**
- UI components: Lowercase directory, PascalCase files (`ui/button.tsx`, `ui/card.tsx`)
- Feature components: Descriptive PascalCase (`HeroSection`, `GlobeVisualization`)
- Layout components: Role-based naming (`PageContainer`, `SectionContainer`)

**Types:**
- DTOs: Type suffix (`LoginDto`, `RegisterDto`, `TokenDto`)
- Interfaces: Descriptive names (`AuthContextType`, `ProfileData`, `MyRouterContext`)
- Enums: PascalCase (not heavily used in this codebase)

## Where to Add New Code

**New Feature:**
- Primary code: `src/components/{feature-name}/` for feature-specific components
- Tests: Colocated `src/components/{feature-name}/*.test.tsx`
- Route: `src/routes/{feature-name}.tsx` or `src/routes/{feature-name}/index.tsx`
- Service: `src/services/{feature-name}.service.ts` if API integration needed
- Types: Define in service file or separate `types.ts` if shared

**New Component/Module:**
- Implementation: `src/components/{category}/{ComponentName}.tsx`
- Categories: `ui/` (reusable primitives), `landing/` (landing sections), `layout/` (layout components), or create new category
- shadcn components: Run `shadcn add {component}` from root directory (installs to `src/components/ui/`)

**Utilities:**
- Shared helpers: `src/lib/utils.ts` for generic utilities
- React-specific: `src/hooks/use{FeatureName}.ts` for stateful logic
- Pure functions: `src/utils/{category}.ts` for non-React utilities
- Auth-related: `src/utils/auth-guards.ts`

**New Route:**
- File-based routing: Create `src/routes/{route-name}.tsx`
- Nested routes: Create `src/routes/{parent}/{child}.tsx`
- Index routes: Name file `index.tsx` in subdirectory
- Protected routes: Wrap component with `<ProtectedRoute>` or use `beforeLoad` guard
- Route will auto-generate in `routeTree.gen.ts` on next dev server start

**API Integration:**
- Service class: `src/services/{domain}.service.ts`
- Follow pattern: Class with async methods, use axios from `src/services/api.ts`, export singleton instance
- Types: Define DTOs (request/response types) in same file

**Static Data:**
- Configuration: `src/config/{feature}.ts`
- Mock data: `src/data/{category}/` (e.g., `src/data/globe/markers.ts`)

**3D/Graphics:**
- Three.js components: `src/components/globe/components/`
- Shaders: `src/components/globe/shaders/`
- Controllers: `src/components/globe/controllers/`

**Global State:**
- New context: `src/contexts/{FeatureName}Context.tsx`
- Follow pattern: CreateContext, Provider component, custom hook (e.g., `useAuth`)

## Special Directories

**src/components/ui/**
- Purpose: shadcn/ui component library
- Generated: Yes, via shadcn CLI
- Committed: Yes
- Source: Multiple registries (@aceternity, @shadcnblocks, @cult-ui, @kibo-ui, @reui-ui, @shadcn-for, @reactbits)
- Management: Use `shadcn add {component}` from root, not manual edits

**node_modules/**
- Purpose: npm dependencies
- Generated: Yes, via `npm install`
- Committed: No
- Size: Large (typical node_modules)

**.tanstack/tmp/**
- Purpose: TanStack Router temporary files
- Generated: Yes, by router plugin
- Committed: No

**src/routeTree.gen.ts**
- Purpose: Generated route tree for TanStack Router
- Generated: Yes, automatically on save/build
- Committed: Yes
- Warning: Do not manually edit - regenerated on each build

**public/**
- Purpose: Static assets served at root URL
- Generated: No (manually created)
- Committed: Yes
- Note: Files served as-is, no processing

**.planning/**
- Purpose: GSD system documentation
- Generated: Yes, by GSD commands
- Committed: Yes
- Contains: Codebase analysis, implementation plans

**dist/** (build output)
- Purpose: Production build output
- Generated: Yes, via `npm run build`
- Committed: No
- Location: Not visible in source tree (gitignored)

## Import Patterns

**Path Aliases:**
- `@/*` maps to `src/*`
- Example: `import { Button } from '@/components/ui/button'`
- Example: `import { useAuth } from '@/contexts/AuthContext'`
- Configured in: `tsconfig.json` and `vite.config.ts`

**Typical Import Order:**
1. React and framework imports
2. Third-party libraries (TanStack, Radix, Lucide)
3. Absolute imports using `@/` alias
4. Relative imports (rare, mostly avoided)
5. Style imports (if any)

**File Extensions:**
- Always use explicit `.tsx` for components
- Use `.ts` for non-component TypeScript files
- Import without extension in code (bundler resolves)

## Module Boundaries

**Services → API:**
- Services make HTTP calls via configured axios instance
- No direct fetch or axios imports in components

**Components → Services:**
- Components call services via TanStack Query hooks or direct async calls
- Services never import components

**Components → Contexts:**
- Components access contexts via custom hooks (e.g., `useAuth()`)
- Never use `useContext(AuthContext)` directly

**Routes → Components:**
- Routes compose feature components
- Routes should be thin, delegating logic to components/services

**Utils/Hooks → Everything:**
- Can be imported anywhere
- Should have no dependencies on components or routes

---

*Structure analysis: 2026-02-07*
