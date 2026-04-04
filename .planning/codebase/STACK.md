# Technology Stack

**Analysis Date:** 2026-02-07

## Languages

**Primary:**
- TypeScript 5.7.2 - All application code
- JavaScript (ES2022) - Configuration files

**Secondary:**
- CSS - Styling via Tailwind CSS v4

## Runtime

**Environment:**
- Node.js >=20.0.0

**Package Manager:**
- npm >=10.0.0
- Lockfile: present (`package-lock.json`)

## Frameworks

**Core:**
- React 19.0.0 - UI library with JSX/TSX
- Vite 6.3.5 - Build tool and dev server
- TanStack Router 1.130.2 - File-based routing with auto code-splitting

**Testing:**
- Vitest 3.0.5 - Unit test runner
- @testing-library/react 16.2.0 - React component testing
- @testing-library/dom 10.4.0 - DOM testing utilities
- jsdom 26.0.0 - DOM simulation

**Build/Dev:**
- @vitejs/plugin-react 4.3.4 - Vite React plugin
- @tanstack/router-plugin 1.121.2 - Router plugin for Vite
- @tailwindcss/vite 4.1.11 - Tailwind CSS v4 Vite integration
- TypeScript 5.7.2 - Type checking (non-strict mode)

## Key Dependencies

**Critical:**
- axios 1.11.0 - HTTP client with interceptors for auth/token refresh
- @tanstack/react-query 5.66.5 - Server state management and caching
- @tanstack/react-form 1.0.0 - Form handling with validation
- zod 3.24.2 - Runtime schema validation
- @t3-oss/env-core 0.12.0 - Type-safe environment variables

**UI Components:**
- @radix-ui/* - Headless UI primitives (accordion, dialog, dropdown, select, tabs, toast, etc.)
- lucide-react 0.537.0 - Icon library
- class-variance-authority 0.7.1 - CSS variant management
- tailwind-merge 3.3.1 - Tailwind class merging utility
- clsx 2.1.1 - Class name utility
- motion 12.23.22 - Animation library

**3D Graphics:**
- three 0.180.0 - 3D rendering library
- @react-three/fiber 9.3.0 - React renderer for Three.js
- @react-three/drei 10.7.6 - Three.js helpers
- @react-three/postprocessing 3.0.4 - Post-processing effects
- postprocessing 6.37.8 - Post-processing library

**Data Visualization:**
- echarts 5.6.0 - Charting library
- echarts-for-react 3.0.2 - React wrapper for ECharts

**Data Processing:**
- xlsx 0.18.5 - Excel file parsing
- date-fns 4.1.0 - Date manipulation
- world-atlas 2.0.2 - Geographic data
- topojson-client 3.1.0 - TopoJSON utilities
- earcut 3.0.2 - Polygon triangulation
- polygon-clipping 0.15.7 - Polygon operations

**NLP/Text Analysis:**
- compromise 14.14.4 - Natural language processing
- franc 6.2.0 - Language detection
- sentiment 5.0.2 - Sentiment analysis

**Infrastructure:**
- @faker-js/faker 9.6.0 - Test data generation
- @tanstack/match-sorter-utils 8.19.4 - Fuzzy searching/filtering
- @tanstack/react-table 8.21.2 - Table state management
- react-icons 5.5.0 - Additional icon sets

## Configuration

**Environment:**
- Configured via `.env.development` and `.env.example` files
- Type-safe validation through `src/env.ts` using T3 Env + Zod
- Client variables must have `VITE_` prefix
- Available variables:
  - `VITE_APP_TITLE`: Application title
  - `VITE_API_URL`: Backend API URL (default: http://localhost:3001/api)
  - `VITE_MICROSOFT_CLIENT_ID`: OAuth Microsoft client ID
  - `VITE_GOOGLE_CLIENT_ID`: OAuth Google client ID
  - `SERVER_URL`: Server-side URL for SSR/SSG

**Build:**
- `vite.config.ts`: Build configuration with manual chunking strategy
- `tsconfig.json`: TypeScript config (non-strict mode, ES2022 target, bundler resolution)
- `vitest.config.ts`: Test configuration with jsdom environment
- `eslint.config.js`: Uses @tanstack/eslint-config
- `prettier.config.js`: Code formatting (no semi, single quotes, trailing commas)
- `components.json`: shadcn/ui configuration with multiple registry support

## Platform Requirements

**Development:**
- Node.js 20+ with npm 10+
- Runs on port 3000 by default
- Hot module replacement enabled via Vite

**Production:**
- Static build output via Vite
- Deployment target: Azure Static Web Apps (config present: `public/staticwebapp.config.json`)
- Manual chunk splitting: react-vendor, router, ui
- Chunk size warning limit: 600KB

---

*Stack analysis: 2026-02-07*
