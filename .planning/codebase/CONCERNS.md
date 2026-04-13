# Codebase Concerns

**Analysis Date:** 2026-02-07

## Tech Debt

**TypeScript Non-Strict Mode:**
- Issue: TypeScript configured with `strict: false` and all linting flags disabled in `horizon-frontend/tsconfig.json`
- Files: `horizon-frontend/tsconfig.json`
- Impact: Type safety compromised across entire codebase. Implicit `any` types proliferate (45+ console.log statements, frequent `any` in error handlers). No compile-time protection against null/undefined access, unused variables, or fallthrough cases.
- Fix approach: Enable strict mode incrementally. Start with `noImplicitAny: true`, fix violations file-by-file, then enable remaining strict flags. Use `build:check` and `build:strict` scripts already configured in package.json.

**Duplicate Axios Instances:**
- Issue: Two separate axios configurations with identical token refresh logic
- Files: `horizon-frontend/src/services/api.ts` and `horizon-frontend/src/lib/axios.ts`
- Impact: Inconsistent behavior if one is updated but not the other. Maintenance burden. Services use `api.ts` while some routes may use `axios.ts`.
- Fix approach: Consolidate into single axios instance in `horizon-frontend/src/services/api.ts`, delete `horizon-frontend/src/lib/axios.ts`, update all imports.

**Hard-coded API URL Fallback:**
- Issue: Default API URL hardcoded to `https://localhost:7056/api` in both axios instances
- Files: `horizon-frontend/src/services/api.ts` (line 3), `horizon-frontend/src/lib/axios.ts` (line 3)
- Impact: Development configuration leaks to production if VITE_API_URL not set. HTTPS localhost certificate issues in dev.
- Fix approach: Remove fallback or use development-appropriate default. Fail fast if VITE_API_URL missing in production builds.

**Console Logging in Production:**
- Issue: 45+ console.log/error/warn statements throughout source code
- Files: Widespread across 20+ files including `horizon-frontend/src/services/auth.service.ts`, `horizon-frontend/src/components/login-form.tsx`, `horizon-frontend/src/data/globe/geometry/loaders.ts`
- Impact: Performance overhead, sensitive data potentially logged to browser console (tokens, user data), unprofessional user experience
- Fix approach: Replace with proper logging framework. Use build-time stripping for production. Implement structured logging with log levels.

**Large Component Files:**
- Issue: Several components exceed 400-500 lines
- Files: `horizon-frontend/src/components/Navbar.tsx` (534 lines), `horizon-frontend/src/components/innovation-lab/CamouflageEvolution.tsx` (534 lines), `horizon-frontend/src/routes/profile.tsx` (488 lines), `horizon-frontend/src/components/register-form.tsx` (426 lines)
- Impact: Difficult to test, review, and maintain. Multiple responsibilities mixed. Complex state management.
- Fix approach: Extract sub-components, hooks, and business logic. Split Navbar into NavigationMenu, MobileNav, UserMenu components. Extract CamouflageEvolution game logic into custom hooks.

**Error Handling with `any`:**
- Issue: Catch blocks consistently typed as `any` instead of proper error types
- Files: 39 occurrences across 25 files including `horizon-frontend/src/contexts/AuthContext.tsx` (lines 72, 84, 96), `horizon-frontend/src/routes/profile.tsx` (lines 96, 131)
- Impact: Type safety bypassed in error paths. Cannot safely access error properties. Runtime errors if error structure unexpected.
- Fix approach: Use `unknown` type in catch blocks, add type guards. Create typed error classes for API errors. Example: `catch (error: unknown) { const err = error as AxiosError; }`

**Generated Route Tree in Source:**
- Issue: Auto-generated `routeTree.gen.ts` (681 lines) contains 32 `as any` type assertions
- Files: `horizon-frontend/src/routeTree.gen.ts`
- Impact: Type safety hole in routing layer. File in src/ but shouldn't be edited (comment warns against modifications).
- Fix approach: This is expected for TanStack Router codegen. Consider moving to `.tanstack/` or `generated/` directory to make generated nature clearer.

**Deprecated Code Still Present:**
- Issue: Deprecated types and files still in active use
- Files: `horizon-frontend/src/services/auth.service.ts` (CompanyRegisterDto marked deprecated but exported), `horizon-frontend/src/data/worldGeography.ts` (entire file deprecated but maintained)
- Impact: Confusing for new developers. Deprecated code may not receive security updates. Migration path unclear.
- Fix approach: Either complete migration and remove deprecated code, or document migration timeline with clear end date.

## Known Bugs

**Password Validation Inconsistency:**
- Symptoms: Registration form requires minimum 6 characters, password change requires 8 characters
- Files: `horizon-frontend/src/components/register-form.tsx` (line 58), `horizon-frontend/src/routes/profile.tsx` (line 113)
- Trigger: Create account with 6-char password, then try to change it to different 6-char password - fails
- Workaround: Use 8+ character passwords everywhere

## Security Considerations

**Token Storage in localStorage:**
- Risk: JWT tokens (access + refresh) stored in localStorage vulnerable to XSS attacks
- Files: `horizon-frontend/src/services/auth.service.ts` (lines 134-136), `horizon-frontend/src/services/api.ts` (line 16)
- Current mitigation: None - tokens readable by any JavaScript on page
- Recommendations: Move refresh token to httpOnly cookie (requires backend change). Consider session-based auth for high-security areas. Implement CSP headers. Add XSS protection middleware.

**Client-Side Token Refresh:**
- Risk: Token refresh logic in client allows extended sessions without re-authentication
- Files: `horizon-frontend/src/services/api.ts` (lines 28-64), `horizon-frontend/src/lib/axios.ts` (lines 28-64)
- Current mitigation: Refresh token can be revoked server-side
- Recommendations: Add absolute session timeout (e.g., 24 hours). Require re-authentication for sensitive operations. Implement token rotation.

**Hard Redirects on Auth Failure:**
- Risk: Using `window.location.href` for redirects loses application state and may expose CSRF vulnerabilities
- Files: `horizon-frontend/src/lib/axios.ts` (line 58), `horizon-frontend/src/services/api.ts` (line 58), `horizon-frontend/src/components/login-form.tsx` (line 92)
- Current mitigation: None
- Recommendations: Use TanStack Router's navigate() for controlled redirects. Preserve intended destination in state. Add CSRF tokens for state-changing operations.

**Environment Variable Validation:**
- Risk: Environment variables optional in schema, allowing app to run with missing critical config
- Files: `horizon-frontend/src/env.ts` (lines 16-17: VITE_APP_TITLE and VITE_API_URL both optional)
- Current mitigation: Fallback hardcoded values used
- Recommendations: Make VITE_API_URL required in production builds. Add runtime environment validation on app start. Fail fast with clear error messages.

**File Upload Without Size Limits:**
- Risk: Excel file validation warns at 5MB but doesn't enforce hard limit
- Files: `horizon-frontend/src/services/fileValidation.ts` (line 224)
- Current mitigation: Warning displayed to user
- Recommendations: Enforce server-side file size limits. Add client-side hard rejection before upload. Implement streaming validation for large files.

**.env Files in Source:**
- Risk: `.env.development` file present in source tree (note existence only)
- Files: Environment configuration files detected
- Current mitigation: Should be in .gitignore
- Recommendations: Verify .gitignore includes .env*. Use .env.example for documentation only. Audit git history for accidentally committed secrets.

## Performance Bottlenecks

**Large Generated Route Tree:**
- Problem: 681-line auto-generated routing file loaded on app initialization
- Files: `horizon-frontend/src/routeTree.gen.ts`
- Cause: 28+ routes in application, TanStack Router generates full tree upfront
- Improvement path: Already using `autoCodeSplitting: true` in `horizon-frontend/vite.config.ts`. Monitor bundle size. Consider lazy loading for admin/innovation-lab sections.

**Globe Visualization Data Loading:**
- Problem: Loading and parsing topojson geometries synchronously
- Files: `horizon-frontend/src/data/globe/geometry/loaders.ts`, `horizon-frontend/src/data/globe/geometry/fills.ts`, `horizon-frontend/src/data/globe/geometry/coastlines.ts`, `horizon-frontend/src/data/globe/geometry/borders.ts`
- Cause: Multiple console.error statements suggest data loading issues. Large geometry files processed client-side.
- Improvement path: Lazy load globe data only when needed. Use web workers for geometry processing. Cache processed geometries in IndexedDB.

**Excel File Processing:**
- Problem: Large Excel files parsed entirely in memory on main thread
- Files: `horizon-frontend/src/services/fileValidation.ts` (lines 73-97: synchronous XLSX.read and sheet_to_json)
- Cause: XLSX library blocks main thread during parsing
- Improvement path: Move Excel parsing to web worker. Stream large files. Add loading states with progress indicators.

**Innovation Lab localStorage Usage:**
- Problem: High score persistence uses localStorage synchronously
- Files: `horizon-frontend/src/components/innovation-lab/CamouflageEvolution.tsx` (line 149)
- Cause: localStorage.getItem called on component mount, blocks render
- Improvement path: Use async storage wrapper. Defer non-critical reads. Consider IndexedDB for complex game state.

## Fragile Areas

**Authentication State Management:**
- Files: `horizon-frontend/src/contexts/AuthContext.tsx`, `horizon-frontend/src/services/auth.service.ts`, `horizon-frontend/src/services/api.ts`
- Why fragile: Multiple sources of truth (JWT decode, profile API, localStorage). Token expiry checked in multiple places. Manual synchronization between context and service.
- Safe modification: Always update both auth service AND context. Test token refresh flow. Verify logout clears all state (4 localStorage keys).
- Test coverage: No automated tests for auth flows

**Two-Factor Authentication Flow:**
- Files: `horizon-frontend/src/components/TwoFactorVerification.tsx`, `horizon-frontend/src/components/TwoFactorSetup.tsx`, `horizon-frontend/src/services/auth.service.ts` (lines 239-274)
- Why fragile: Complex multi-step flow (setup → enable → verify → recovery codes). Recovery code format validation hardcoded (XXXXX-XXXXX pattern). State machine implicit, not explicit.
- Safe modification: Test all paths (enable, disable, verify, recovery). Don't change recovery code format without backend coordination. Maintain backward compatibility.
- Test coverage: No automated tests detected

**File Upload Validation:**
- Files: `horizon-frontend/src/services/fileValidation.ts`, `horizon-frontend/src/components/datasets/FileUpload.tsx`, `horizon-frontend/src/components/datasets/DatasetsManager.tsx`
- Why fragile: Complex heuristic to detect header row (searches first 5 rows). Flexible column pattern matching (English and Dutch). Optional columns create 100+ possible valid combinations.
- Safe modification: Add test fixtures with real Astraia exports. Don't tighten validation without user testing. Maintain column pattern flexibility.
- Test coverage: No automated tests for validation logic

**OAuth Callback Handling:**
- Files: `horizon-frontend/src/routes/auth.callback.tsx`, `horizon-frontend/src/services/oauth.service.ts`
- Why fragile: PKCE flow with localStorage state management. CSRF protection via state parameter. Multiple error conditions (lines 35, 39, 43, 49 throw different errors).
- Safe modification: Never remove CSRF checks. Test with expired/invalid state. Clear OAuth state from localStorage on success/failure.
- Test coverage: No automated tests for OAuth flows

## Scaling Limits

**Client-Side Role/Permission Checks:**
- Current capacity: User object contains roles array and permissions array
- Limit: As permission system grows, JWT payload size increases. Client-side checks can be bypassed.
- Scaling path: Move complex authorization to backend. Use role-based routing. Implement permission caching. Add backend authorization checks on all protected endpoints.

**LocalStorage Token Management:**
- Current capacity: 4 keys stored (accessToken, refreshToken, tokenExpiry, user)
- Limit: localStorage ~5-10MB total, synchronous API blocks UI
- Scaling path: Migrate to IndexedDB for large data. Keep only access token in memory. Use httpOnly cookies where possible.

**TanStack Query Cache:**
- Current capacity: Default in-memory cache for all queries
- Limit: Cache grows unbounded in long-running sessions
- Scaling path: Configure cache time limits. Implement cache size limits. Use persistent cache (IndexedDB) for offline support.

## Dependencies at Risk

**React 19.0.0:**
- Risk: Very new React version (released late 2024), ecosystem catching up
- Impact: Potential incompatibilities with libraries expecting React 18. Breaking changes in testing libraries.
- Migration plan: Monitor @testing-library/react compatibility. Watch for React 19-specific issues in Three.js integration (@react-three packages).

**Tailwind CSS v4:**
- Risk: Major version using new Vite plugin, still stabilizing
- Impact: Breaking changes from v3. Less community resources. Plugin ecosystem compatibility unknown.
- Migration plan: Pin version strictly. Test all UI components after updates. Have rollback plan to Tailwind v3 if needed.

**Three.js and React-Three:**
- Risk: Heavy dependencies (large bundle), complex version coordination between three, @react-three/fiber, @react-three/drei
- Impact: Bundle size (globe visualization loads large geometry files). Version mismatches cause runtime errors.
- Migration plan: Consider lazy loading Three.js. Explore lighter 3D alternatives. Monitor bundle size in build reports.

## Missing Critical Features

**Error Boundary:**
- Problem: No React Error Boundary implementation detected
- Blocks: Uncaught errors crash entire app. No graceful degradation. Users see blank screen.

**Loading States:**
- Problem: Inconsistent loading UX (some components have loaders, others don't)
- Blocks: Poor perceived performance. User confusion during async operations.

**Offline Support:**
- Problem: No service worker or offline strategy
- Blocks: App unusable without network. Forms lose data on connection loss.

**Session Timeout Warning:**
- Problem: Token expires silently, user redirected to login without warning
- Blocks: Poor UX (lost form data). Confusing for users in long-running sessions.

## Test Coverage Gaps

**Authentication Flows:**
- What's not tested: Login, logout, token refresh, 2FA setup/verification
- Files: `horizon-frontend/src/contexts/AuthContext.tsx`, `horizon-frontend/src/services/auth.service.ts`
- Risk: Breaking changes undetected. Security vulnerabilities in auth logic.
- Priority: High

**Form Validation:**
- What's not tested: Register form, password change, profile update, file upload validation
- Files: `horizon-frontend/src/components/register-form.tsx`, `horizon-frontend/src/routes/profile.tsx`, `horizon-frontend/src/services/fileValidation.ts`
- Risk: Invalid data submitted to API. User-facing validation bugs.
- Priority: High

**Excel File Parser:**
- What's not tested: Column detection, header row finding, data validation
- Files: `horizon-frontend/src/services/fileValidation.ts`
- Risk: Production files rejected incorrectly. Invalid files accepted.
- Priority: High

**OAuth Integration:**
- What's not tested: PKCE flow, state validation, token exchange
- Files: `horizon-frontend/src/services/oauth.service.ts`, `horizon-frontend/src/routes/auth.callback.tsx`
- Risk: Security vulnerabilities (CSRF). Silent auth failures.
- Priority: High

**Component Integration:**
- What's not tested: No test files found in `horizon-frontend/src/` (0 *.test.* or *.spec.* files)
- Files: All components (189 TypeScript files total)
- Risk: Regressions in UI. Broken user workflows.
- Priority: Medium

**API Service Layer:**
- What's not tested: API calls, error handling, response parsing
- Files: `horizon-frontend/src/services/*.ts`
- Risk: Network failures unhandled. API contract changes break silently.
- Priority: Medium

---

*Concerns audit: 2026-02-07*
