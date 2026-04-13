# External Integrations

**Analysis Date:** 2026-02-07

## APIs & External Services

**OAuth Authentication:**
- Microsoft OAuth 2.0 - User authentication via Azure AD
  - SDK/Client: Native fetch + PKCE flow
  - Auth: `VITE_MICROSOFT_CLIENT_ID` (client ID only, uses PKCE)
  - Token endpoint: `https://login.microsoftonline.com/common/oauth2/v2.0/token`
  - Implementation: `src/services/oauth.service.ts`

- Google OAuth 2.0 - User authentication
  - SDK/Client: Backend exchange (requires client_secret)
  - Auth: `VITE_GOOGLE_CLIENT_ID`
  - Token endpoint: Backend `/auth/exchange-code`
  - Implementation: `src/services/oauth.service.ts`

**Backend API:**
- Custom REST API
  - Base URL: Configurable via `VITE_API_URL` (default: https://localhost:7056/api)
  - Client: axios with interceptors
  - Auth: JWT Bearer tokens (access + refresh)
  - Implementation: `src/services/api.ts`

## Data Storage

**Databases:**
- Backend-managed database (API abstraction)
  - Connection: Via REST API endpoints
  - Client: axios HTTP client
  - No direct database connection from frontend

**File Storage:**
- Local browser storage only (localStorage)
  - Tokens: `accessToken`, `refreshToken`, `tokenExpiry`
  - User data: `user` (cached)
  - Theme: `horizon-tech-theme`
  - OAuth state: sessionStorage for PKCE (`oauth_state`, `code_verifier`, `oauth_provider`)

**Caching:**
- TanStack Query (in-memory)
  - User profile cached with 5-minute stale time
  - Query key: `['userProfile']`
  - Configuration: `src/integrations/tanstack-query/root-provider.tsx`

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication
  - Implementation: `src/services/auth.service.ts`
  - Token storage: localStorage
  - Token refresh: Automatic via axios interceptor
  - OAuth integration: Microsoft and Google via `src/services/oauth.service.ts`
  - Two-factor authentication: TOTP with recovery codes
  - Endpoints:
    - `/auth/login` - Email/password login
    - `/auth/register` - User registration
    - `/auth/refresh-token` - Token refresh
    - `/auth/external-login` - OAuth login
    - `/auth/revoke-token` - Logout
    - `/auth/2fa/*` - Two-factor authentication endpoints
    - `/auth/confirm-email` - Email confirmation

**Authorization:**
- Role-based access control (RBAC)
  - Roles: Admin, MasterAdmin, Owner, Employee, Individual
  - Permissions: Embedded in JWT token
  - Context: `src/contexts/AuthContext.tsx` with TanStack Query
  - Profile service: `src/services/profile.service.ts`

## Monitoring & Observability

**Error Tracking:**
- None (no external service integration detected)

**Logs:**
- Browser console only
- No centralized logging service

**Performance Monitoring:**
- Web Vitals tracking configured
  - Implementation: `src/reportWebVitals.ts`
  - Not connected to external service (requires custom callback)

## CI/CD & Deployment

**Hosting:**
- Azure Static Web Apps
  - Configuration: `public/staticwebapp.config.json`
  - Routes and navigation fallback configured

**CI Pipeline:**
- Not detected in repository

## Environment Configuration

**Required env vars:**
- `VITE_API_URL`: Backend API endpoint (critical)
- `VITE_APP_TITLE`: Application title (optional)
- `VITE_MICROSOFT_CLIENT_ID`: Microsoft OAuth (optional, for OAuth)
- `VITE_GOOGLE_CLIENT_ID`: Google OAuth (optional, for OAuth)
- `SERVER_URL`: Server URL for SSR/SSG (optional)

**Secrets location:**
- `.env.development` file (not committed)
- `.env.example` template provided

## Webhooks & Callbacks

**Incoming:**
- OAuth callback endpoint: `/auth/callback` (route-based)
  - Handles Microsoft and Google OAuth redirects
  - State verification via sessionStorage
  - Implementation: `src/services/oauth.service.ts`

**Outgoing:**
- None detected

## API Integration Details

**Authentication Flow:**
1. User logs in via email/password or OAuth
2. Backend returns JWT (access + refresh tokens)
3. Tokens stored in localStorage
4. axios interceptor adds `Authorization: Bearer {token}` to all requests
5. On 401 response, interceptor attempts token refresh
6. On refresh failure, redirects to `/login`

**OAuth Flow (Microsoft):**
1. Frontend initiates OAuth with PKCE challenge
2. User authenticates with Microsoft
3. Microsoft redirects to `/auth/callback` with authorization code
4. Frontend exchanges code for tokens using PKCE verifier
5. Frontend sends ID token to backend `/auth/external-login`
6. Backend validates and returns JWT tokens
7. Implementation: `src/services/oauth.service.ts`

**OAuth Flow (Google):**
1. Frontend initiates OAuth without PKCE
2. User authenticates with Google
3. Google redirects to `/auth/callback` with authorization code
4. Frontend sends code to backend `/auth/exchange-code`
5. Backend exchanges code (requires client_secret)
6. Backend validates and returns JWT tokens
7. Implementation: `src/services/oauth.service.ts`

**Profile Data Flow:**
1. AuthContext queries profile on authentication
2. TanStack Query fetches from `/profile/me`
3. Profile cached with 5-minute stale time
4. Auto-refetch on window focus and reconnect
5. Implementation: `src/contexts/AuthContext.tsx`, `src/services/profile.service.ts`

---

*Integration audit: 2026-02-07*
