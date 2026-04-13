# Technology Stack

**Project:** Horizon Tech d.o.o. Sarajevo -- Corporate Website (i18n, SEO, Landing Pages)
**Researched:** 2026-02-07
**Research Mode:** Ecosystem (Stack dimension)
**Overall Confidence:** MEDIUM-HIGH

---

## Context: Existing Stack (Locked In)

These technologies are already in production and are NOT up for reconsideration. All recommendations below must integrate cleanly with this foundation.

| Technology | Version | Role |
|---|---|---|
| React | ^19.0.0 | UI framework |
| TanStack Router | ^1.130.2 | File-based routing |
| TanStack Query | ^5.66.5 | Server state |
| TanStack Form | ^1.0.0 | Form handling with Zod |
| Tailwind CSS | ^4.1.11 | Styling (via @tailwindcss/vite plugin) |
| Vite | ^6.3.5 | Build tool |
| shadcn/ui | ^3.3.1 | Component system (New York style) |
| Axios | ^1.11.0 | HTTP client with JWT interceptors |
| Three.js | ^0.180.0 | 3D globe + CRT effects |
| Motion (Framer) | ^12.23.22 | Animations |
| Zod | ^3.24.2 | Schema validation |
| TypeScript | ^5.7.2 | Type safety |

**Deployment:** Azure Static Web Apps (static hosting, no server runtime)

---

## Recommended Stack: New Additions

### 1. Internationalization (i18n)

| Technology | Version | Purpose | Confidence |
|---|---|---|---|
| **i18next** | ^25.8.4 | Core i18n framework | HIGH |
| **react-i18next** | ^16.5.4 | React bindings (hooks, components, context) | HIGH |
| **i18next-browser-languagedetector** | ^8.2.0 | Auto-detect user language from browser/localStorage/cookie | HIGH |
| **i18next-resources-to-backend** | ^1.2.1 | Lazy-load translation JSON via Vite dynamic imports | HIGH |

#### Why i18next + react-i18next

- **Ecosystem dominance:** i18next is the most widely adopted JS i18n framework with 25+ million weekly npm downloads. react-i18next has ~6,000 dependent packages. No credible alternative comes close for a React SPA.
- **Arabic pluralization:** i18next handles Arabic's 6 plural forms natively (`zero`, `one`, `two`, `few`, `many`, `other`) via CLDR rules. This is critical for the Arabic locale requirement.
- **RTL awareness:** `i18n.dir()` returns `"rtl"` or `"ltr"` for any locale, enabling document direction switching.
- **Namespace support:** Translations can be split by feature/page (`common.json`, `services.json`, `landing.json`) and lazy-loaded per route.
- **React 19 compatible:** v16.x works with React 19 without peer dependency issues.
- **TypeScript support:** Full type safety for translation keys via module augmentation.
- **Mature plugin ecosystem:** Language detection, HTTP backends, localStorage caching, and post-processors are all production-proven.

#### Why `i18next-resources-to-backend` over `i18next-http-backend`

- **Vite-native lazy loading:** Uses Vite's `import()` for code-splitting translation files. Translations are bundled and hash-cached by Vite automatically.
- **No runtime HTTP requests:** Translation JSON files are bundled as separate chunks, not fetched from a server path. This is important for Azure Static Web Apps where there is no backend to serve `/locales/en/translation.json`.
- **Simpler deployment:** No need to configure static file serving paths or worry about CORS.

```typescript
// How it works with Vite
import resourcesToBackend from 'i18next-resources-to-backend';

i18n.use(
  resourcesToBackend((language, namespace) =>
    import(`./locales/${language}/${namespace}.json`)
  )
);
```

#### Alternatives Considered and Rejected

| Alternative | Why Not |
|---|---|
| **Paraglide JS** | Compile-time i18n with zero runtime. Interesting but immature React integration. Official TanStack Router support exists only for TanStack Start (SSR), not the client-side SPA router. Would require significant custom wiring. LOW confidence it works cleanly with file-based routing in SPA mode. |
| **LinguiJS** | Good library, smaller ecosystem. No equivalent to `i18next-browser-languagedetector`. Fewer tutorials and community resources for troubleshooting Arabic/RTL edge cases. |
| **Intlayer** | Newer entrant. Content declaration approach is interesting but the library is too young for a corporate production site. Insufficient community validation. |
| **FormatJS / react-intl** | Solid ICU MessageFormat support. But more complex API, less intuitive for non-developer translators (Bosnian/Arabic translators will be editing JSON files), and smaller React ecosystem than i18next. |
| **DIY with React Context** | Would need to rebuild pluralization, interpolation, language detection, namespace loading, and RTL direction -- all of which i18next provides out of the box. Not worth the effort. |

---

### 2. SEO: Document Head Management

| Technology | Version | Purpose | Confidence |
|---|---|---|---|
| **@unhead/react** | ^2.0.19 (stable) | Document head management (title, meta, OG tags, structured data) | MEDIUM-HIGH |

#### Why @unhead/react

- **Modern replacement:** Both `react-helmet` (unmaintained since 2020) and `react-helmet-async` (does NOT support React 19 peer dependencies) are effectively dead. `@dr.pogodin/react-helmet` (v3.0.5) exists as a fork but follows the same aging API patterns.
- **TanStack ecosystem alignment:** TanStack Router's official documentation for "Document Head Management" references Unhead as the recommended solution. This is the endorsed path.
- **Type-safe API:** `useHead()` and `useSeoMeta()` hooks provide full TypeScript autocomplete for all meta tag properties. No more stringly-typed `<meta name="..." content="...">`.
- **Automatic deduplication:** Tags are deduped by key, so nested route components can override parent meta tags cleanly.
- **SSR-ready:** If the project ever migrates to TanStack Start or adds a pre-rendering layer, Unhead works in both CSR and SSR modes without API changes.
- **`useSeoMeta()` composable:** Purpose-built for SEO -- sets `title`, `description`, `og:title`, `og:description`, `twitter:card`, etc. in one call.

#### IMPORTANT CAVEAT: React 19 + @unhead/react Compatibility

The stable v2.x line was released before React 19. The v3 beta (`@unhead/react@next`) explicitly targets React 19. As of 2026-02-07, v3 is in beta.

**Recommendation:** Start with `@unhead/react@next` (v3 beta). If stability issues arise during development, fall back to React 19's built-in `<title>` and `<meta>` tag hoisting (new in React 19) combined with a thin wrapper utility. React 19 natively hoists `<title>`, `<meta>`, and `<link>` tags from components to `<head>`, which covers 80% of use cases.

**Fallback plan (if Unhead v3 beta is too unstable):**

| Technology | Version | Purpose | Confidence |
|---|---|---|---|
| **@dr.pogodin/react-helmet** | ^3.0.5 | React 19-compatible Helmet fork | MEDIUM |

This fork is actively maintained, explicitly supports React 19, and includes `<MetaTags>` helper component for SEO + social graph metadata. The API is familiar (same as react-helmet-async).

#### Alternatives Considered and Rejected

| Alternative | Why Not |
|---|---|
| **react-helmet-async** | Does NOT list React 19 in peer dependencies (`^16.6.0 \|\| ^17.0.0 \|\| ^18.0.0`). Requires `--legacy-peer-deps` to install with React 19. Library is unmaintained. |
| **react-helmet (original)** | Unmaintained since 2020. Not thread-safe. Relies on react-side-effect. |
| **React 19 native `<title>` / `<meta>`** | Works for basics but no programmatic API, no deduplication logic, no `og:*` helpers, no structured data support. Insufficient alone for a corporate SEO strategy. |

---

### 3. SEO: Structured Data (JSON-LD)

| Technology | Version | Purpose | Confidence |
|---|---|---|---|
| **react-schemaorg** | ^2.0.0 | Type-checked Schema.org JSON-LD rendering | MEDIUM |
| **schema-dts** | ^1.1.5 | TypeScript types for Schema.org vocabulary | MEDIUM |

#### Why react-schemaorg + schema-dts

- **Google-maintained:** Both packages are from Google. `schema-dts` gets 100k+ weekly npm downloads.
- **Type-safe:** Full TypeScript discriminated unions for all Schema.org types. Autocomplete for `Organization`, `WebSite`, `Service`, `LocalBusiness`, `FAQPage`, etc.
- **Simple API:** `<JsonLd<Organization> item={{ ... }} />` renders a `<script type="application/ld+json">` tag.
- **Critical for corporate SEO:** Structured data powers rich snippets in Google Search (company info, services, FAQ dropdowns, breadcrumbs).

#### IMPORTANT CAVEAT: Pre-rendering Required

Google states: "Although it is technically possible to inject structured data via frontend JavaScript, this approach is less reliable because Google may not fully execute your JavaScript." Structured data injected client-side may be missed. Pre-rendering (see section 4) is essential to make JSON-LD effective for SEO.

#### Alternatives Considered

| Alternative | Why Not |
|---|---|
| **Manual `<script>` tags** | No type safety. Easy to produce invalid JSON-LD. schema-dts catches errors at compile time. |
| **react-structured-data** | Last updated years ago. No TypeScript types. Fewer schema types supported. |
| **Unhead's built-in `useSchemaOrg()`** | Only available in v3 beta for Vue/Nuxt. React support for schema.org composables is not yet documented. |

---

### 4. SEO: Pre-rendering (Build-Time Static HTML)

| Technology | Version | Purpose | Confidence |
|---|---|---|---|
| **vite-plugin-prerender** | ^1.0.8 | Build-time pre-rendering of SPA routes to static HTML | MEDIUM |

#### Why Build-Time Pre-rendering

Azure Static Web Apps has no server runtime for SSR. The deployment constraint is: **everything must be static files**. Build-time pre-rendering is the only viable approach:

1. Build the SPA normally with Vite
2. Launch a headless browser (Puppeteer) against the built files
3. Capture the rendered HTML for each route
4. Write static `.html` files to the output directory
5. Deploy the pre-rendered HTML + the SPA bundle together

Crawlers get fully-rendered HTML. Users get the SPA experience after hydration.

#### Why vite-plugin-prerender

- **Vite-native:** Integrates as a Vite build plugin. No separate build step.
- **Puppeteer-based:** Uses `@prerenderer/renderer-puppeteer` to render pages in headless Chrome. Most reliable rendering approach for SPAs with complex JS (Three.js, animations).
- **Route configuration:** Explicit route array `['/', '/about', '/services', '/contact', '/en/services', '/bs/services']` -- works perfectly with known corporate page URLs.
- **Post-process hooks:** Can strip scripts, add `<meta>` tags, or modify rendered HTML before writing.

#### IMPORTANT CAVEATS

1. **Maintenance concern:** Last published 2 years ago (v1.0.8). The underlying `@prerenderer/renderer-puppeteer` (v1.2.4) is also 2 years old. These work but are not actively maintained. Monitor for breakage with newer Puppeteer versions.

2. **Puppeteer in CI/CD:** Azure DevOps / GitHub Actions needs a Chromium-capable environment. Use a Docker image with Chrome pre-installed or install Chromium as a build step.

3. **i18n route explosion:** With 3 locales (en, bs, ar) and ~15 pages, you get ~45 pre-rendered HTML files. This is manageable. Budget for build time increase (~2-5 seconds per page).

4. **Three.js pages:** The globe/CRT effects pages will be expensive to pre-render. Consider excluding them from pre-rendering (they are not SEO-critical) or setting a `renderAfterTime` of 3-5 seconds.

#### Alternative Strategy: Service-Based Pre-rendering

| Technology | Cost | Purpose | Confidence |
|---|---|---|---|
| **Prerender.io** | From $90/month | Cloud service that renders pages on-demand for crawlers | MEDIUM |

If build-time pre-rendering proves too fragile or slow, Prerender.io is the industry standard SaaS alternative. It intercepts crawler requests (via middleware or DNS), renders the page in a headless browser, caches the result, and serves static HTML to the crawler. This requires no build pipeline changes.

**For Azure Static Web Apps:** Would need to use a reverse proxy (Azure Front Door or Cloudflare) to route crawler traffic to Prerender.io. This adds infrastructure complexity.

**Recommendation:** Start with build-time `vite-plugin-prerender`. Fall back to Prerender.io only if build-time approach fails.

#### Alternatives Considered and Rejected

| Alternative | Why Not |
|---|---|
| **Next.js / TanStack Start** | Would require rewriting the entire application. The existing TanStack Router file-based routing, Three.js integration, and component library are all built for Vite SPA mode. Migration cost is prohibitive for this milestone. |
| **Vike (vite-plugin-ssr)** | Full SSR framework. Overkill for a corporate site with mostly static content. Would require restructuring the entire app around Vike's rendering model. |
| **vite-prerender-plugin (Preact)** | Designed for Preact. While technically framework-agnostic, the documentation and testing focus on Preact. Risk of edge cases with React 19. |
| **react-snap** | Unmaintained (last commit 2020). Uses Puppeteer v1 APIs. Known to break with modern React. |

---

### 5. SEO: Sitemap + Robots.txt

| Technology | Version | Purpose | Confidence |
|---|---|---|---|
| **vite-plugin-sitemap** | ^0.8.2 | Build-time sitemap.xml and robots.txt generation | MEDIUM-HIGH |

#### Why vite-plugin-sitemap

- **Vite-native:** Runs as part of the build pipeline. Scans dist folder and generates `sitemap.xml` + `robots.txt`.
- **i18n support built-in:** Supports `hreflang` alternate links with configurable languages, default language, and prefix/suffix URL strategies. This is critical for the en/bs/ar locale URLs.
- **Dynamic routes:** Can specify additional routes (like localized variants) via the `dynamicRoutes` option.
- **Route exclusion:** Can exclude auth pages, admin routes, etc. from the sitemap.
- **Simple configuration:** Minimal setup in `vite.config.ts`.

```typescript
// Example configuration
import sitemap from 'vite-plugin-sitemap';

export default defineConfig({
  plugins: [
    sitemap({
      hostname: 'https://horizontech.ba',
      dynamicRoutes: ['/en/services', '/bs/services', '/ar/services'],
      exclude: ['/login', '/register', '/admin', '/profile'],
      i18n: {
        defaultLanguage: 'en',
        languages: ['en', 'bs', 'ar'],
        strategy: 'prefix',
      },
    }),
  ],
});
```

---

### 6. RTL Support

No additional library is needed. Tailwind CSS v4 and i18next together provide everything required.

| Capability | Provider | How | Confidence |
|---|---|---|---|
| **Document direction** | i18next | `i18n.dir()` returns `"rtl"` or `"ltr"`. Set on `<html dir>` attribute via a `useEffect` hook or in the root layout. | HIGH |
| **Inline logical properties** | Tailwind CSS v4 | Built-in utilities: `ms-*` (margin-inline-start), `me-*` (margin-inline-end), `ps-*` (padding-inline-start), `pe-*` (padding-inline-end), `start-*`, `end-*`. These automatically flip in RTL mode. | HIGH |
| **Conditional RTL styles** | Tailwind CSS v4 | `rtl:` and `ltr:` variant modifiers for edge cases: `rtl:space-x-reverse`, `ltr:ml-4 rtl:mr-4`. | HIGH |
| **Font stacking** | CSS | Arabic requires specific font families (e.g., `Noto Sans Arabic`, `Cairo`). Add to Tailwind theme config or load via Google Fonts with `<link>` tag keyed to locale. | HIGH |

#### Implementation Pattern

```typescript
// In root layout or App component
import { useTranslation } from 'react-i18next';

function RootLayout() {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.dir = i18n.dir();
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return <Outlet />;
}
```

#### What NOT to install

| Library | Why Not |
|---|---|
| **tailwindcss-rtl** | Unnecessary. Tailwind v4 has built-in logical property utilities. |
| **tailwindcss-vanilla-rtl** | Was useful for Tailwind v3. Redundant with v4's native support. |
| **tailwindcss-logical** | Same -- v4 covers the inline direction natively. |

---

### 7. TanStack Router i18n Integration

No additional library is needed. TanStack Router's built-in URL rewrite system handles locale-prefixed routing.

| Capability | How | Confidence |
|---|---|---|
| **Locale-prefixed URLs** | TanStack Router `rewrite` option with `input` (strip locale prefix) and `output` (add locale prefix) functions | MEDIUM-HIGH |
| **Default language no-prefix** | `deLocalizeUrl` strips `/en/` prefix; English URLs have no prefix (SEO best practice for default lang) | MEDIUM-HIGH |
| **Link generation** | All `<Link>` components automatically produce localized URLs via the `output` rewrite | MEDIUM-HIGH |

#### URL Strategy

```
Default (English):  /services, /about, /contact
Bosnian:            /bs/services, /bs/about, /bs/contact
Arabic:             /ar/services, /ar/about, /ar/contact
```

This is the recommended "prefix except default" strategy. Google Search Console handles this well, and it keeps the default language URLs clean.

#### Implementation Pattern

```typescript
// router configuration
const router = createRouter({
  routeTree,
  rewrite: {
    input: ({ url }) => deLocalizeUrl(url),  // /bs/about -> /about
    output: ({ url }) => localizeUrl(url),   // /about -> /bs/about
  },
});
```

#### IMPORTANT CAVEAT

TanStack Router's rewrite system for i18n in SPA mode (not TanStack Start) has limited community examples. Most i18n guides target TanStack Start (SSR). The rewrite API itself is documented, but the full i18n recipe for a pure SPA with file-based routing needs validation during implementation. Flag for deeper research in the implementation phase.

---

## Complete Installation Commands

```bash
# Core i18n
npm install i18next react-i18next i18next-browser-languagedetector i18next-resources-to-backend

# SEO: Head management (try v3 beta first, fall back to stable or dr.pogodin fork)
npm install @unhead/react@next
# Fallback: npm install @dr.pogodin/react-helmet

# SEO: Structured data
npm install react-schemaorg schema-dts

# SEO: Build-time pre-rendering
npm install -D vite-plugin-prerender

# SEO: Sitemap generation
npm install -D vite-plugin-sitemap

# RTL: Arabic font (add to HTML or import in CSS)
# No npm package needed -- use Google Fonts CDN or self-host
```

**Estimated bundle impact:**
- i18next + react-i18next + plugins: ~40-50KB gzipped (loaded once, cached)
- @unhead/react: ~8-12KB gzipped
- react-schemaorg + schema-dts: ~2KB runtime (types are compile-time only)
- vite-plugin-prerender: dev dependency only (zero runtime cost)
- vite-plugin-sitemap: dev dependency only (zero runtime cost)

---

## Summary Decision Matrix

| Category | Recommended | Confidence | Risk Level | Fallback |
|---|---|---|---|---|
| i18n core | i18next + react-i18next | HIGH | Low | None needed -- this is the standard |
| i18n translation loading | i18next-resources-to-backend | HIGH | Low | i18next-http-backend (requires serving JSON) |
| i18n language detection | i18next-browser-languagedetector | HIGH | Low | Manual detection via navigator.language |
| Head management | @unhead/react@next (v3 beta) | MEDIUM | Medium | @dr.pogodin/react-helmet ^3.0.5 |
| Structured data | react-schemaorg + schema-dts | MEDIUM | Low | Manual `<script>` tags |
| Pre-rendering | vite-plugin-prerender | MEDIUM | Medium | Prerender.io SaaS ($90+/mo) |
| Sitemap | vite-plugin-sitemap | MEDIUM-HIGH | Low | Manual sitemap.xml |
| RTL layout | Tailwind CSS v4 logical props | HIGH | Low | None needed -- built-in |
| RTL direction | i18next `dir()` + `useEffect` | HIGH | Low | None needed |
| Router i18n | TanStack Router `rewrite` | MEDIUM-HIGH | Medium | Search params `?lang=bs` (worse SEO) |

---

## What NOT to Use

| Technology | Why Not |
|---|---|
| **Next.js** | Would require full rewrite. Existing TanStack Router + Vite + Three.js stack is not portable. |
| **Gatsby** | Dead framework. GraphQL layer is unnecessary overhead. |
| **Astro** | Would require rewrite. Good for content sites but the existing SPA with Three.js and JWT auth is too complex to port. |
| **react-helmet-async** | Does not support React 19. Unmaintained. |
| **react-helmet (original)** | Unmaintained since 2020. Memory leaks. |
| **react-intl / FormatJS** | More complex API, smaller ecosystem, harder for non-dev translators. |
| **Paraglide JS** | SPA integration with TanStack Router (not Start) is unproven. |
| **tailwindcss-rtl plugins** | Redundant with Tailwind v4's built-in logical properties. |
| **react-snap** | Unmaintained, Puppeteer v1 APIs, breaks with modern React. |
| **Rendertron** | Self-hosted, requires ongoing server maintenance. Defeats the purpose of Azure Static Web Apps. |

---

## Sources

### HIGH Confidence (Context7 / Official Docs)
- Context7: react-i18next documentation (library ID: /i18next/react-i18next)
- Context7: i18next documentation (library ID: /websites/i18next)
- Context7: @dr.pogodin/react-helmet (library ID: /birdofpreyru/react-helmet)
- [TanStack Router i18n Guide](https://tanstack.com/router/v1/docs/framework/react/guide/internationalization-i18n)
- [TanStack Router URL Rewrites](https://tanstack.com/router/v1/docs/framework/react/guide/url-rewrites)
- [TanStack Router Document Head Management](https://tanstack.com/router/v1/docs/framework/react/guide/document-head-management)
- [Tailwind CSS v4.0 Logical Properties](https://tailwindcss.com/blog/tailwindcss-v4)
- [Tailwind CSS Positional Utilities (start/end)](https://tailwindcss.com/docs/top-right-bottom-left)
- [Unhead React Installation](https://unhead.unjs.io/docs/react/head/guides/get-started/installation)
- [React 19 Document Metadata](https://react.dev/blog/2024/12/05/react-19)

### MEDIUM Confidence (Verified with Multiple Sources)
- [react-schemaorg (Google)](https://github.com/google/react-schemaorg) -- type-checked Schema.org JSON-LD
- [schema-dts (Google)](https://github.com/google/schema-dts) -- TypeScript Schema.org types
- [vite-plugin-sitemap](https://github.com/jbaubree/vite-plugin-sitemap) -- sitemap generation
- [vite-plugin-prerender](https://github.com/Rudeus3Greyrat/vite-plugin-prerender) -- build-time pre-rendering
- [Unhead migration from React Helmet](https://unhead.unjs.io/docs/react/head/guides/get-started/migrate-from-react-helmet)
- [Azure Static Web Apps pre-rendering feature request](https://github.com/Azure/static-web-apps/issues/196)

### LOW Confidence (Needs Validation)
- TanStack Router SPA-mode rewrite system for i18n (most examples target TanStack Start, not pure SPA)
- @unhead/react v3 beta stability with React 19 (beta software)
- vite-plugin-prerender longevity (last published 2 years ago)
