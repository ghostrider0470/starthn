# Architecture Patterns

**Domain:** i18n, SEO pre-rendering, and multi-language URL routing for corporate tech SPA
**Researched:** 2026-02-07
**Overall confidence:** HIGH (TanStack Router i18n patterns verified via Context7 official docs; React 19 metadata verified via react.dev; pre-rendering patterns verified via multiple sources)

## Executive Summary

The existing Horizon Tech SPA is a React 19 + TanStack Router file-based routing application deployed to Azure Static Web Apps. The architecture challenge is integrating three interconnected concerns -- i18n with language-prefixed URLs, RTL layout switching, and SEO pre-rendering -- without migrating away from the SPA model.

TanStack Router natively supports optional path parameters via `{-$locale}` syntax, which maps directly to the `/en/`, `/bs/`, `/ar/` URL structure required. React 19 provides built-in `<title>` and `<meta>` tag hoisting, eliminating the need for react-helmet. The pre-rendering layer operates as a build-time post-process using Puppeteer to generate static HTML for crawler consumption, deployed alongside the SPA shell on Azure Static Web Apps.

The architecture introduces five new system components: an I18nProvider (wrapping i18next), a locale-aware route layout, a metadata/SEO component system, a structured data injection layer, and a build-time pre-rendering pipeline. These integrate with the existing ThemeProvider, CRTSoundProvider, and TanStack Query stack without requiring changes to the core router configuration.

---

## Recommended Architecture

### High-Level System Diagram

```
Browser Request
      |
      v
Azure Static Web Apps
      |
      +-- Static asset? --> Serve directly (CSS, JS, images, fonts)
      |
      +-- Pre-rendered HTML exists? --> Serve static HTML (for crawlers)
      |
      +-- Fallback --> Serve index.html (SPA shell)
             |
             v
        React 19 SPA Boot
             |
             v
    +-------------------+
    |    Providers       |
    | ThemeProvider      |
    | CRTSoundProvider   |
    | I18nProvider (NEW) |
    | TanStackQuery      |
    +-------------------+
             |
             v
    +-------------------+
    | TanStack Router    |
    | {-$locale}/ layout |
    | Route components   |
    +-------------------+
             |
             v
    +-------------------+
    | Page Components    |
    | + SEO Head (NEW)   |
    | + JSON-LD (NEW)    |
    | + RTL layout (NEW) |
    +-------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With | New/Existing |
|-----------|---------------|-------------------|--------------|
| **I18nProvider** | Initialize i18next, manage current language, load translation files | Router (reads locale param), all UI components (provides `t()` function) | NEW |
| **LocaleLayout** (`routes/{-$locale}.tsx`) | Extract `$locale` param, validate against allowed locales, set `dir` attribute, sync i18n language | I18nProvider, Router, HTML document element | NEW |
| **SEOHead** | Render `<title>`, `<meta>`, Open Graph tags, `<link rel="alternate" hreflang>` per page | I18nProvider (translated titles/descriptions), Router (current path for canonical URLs) | NEW |
| **StructuredData** | Render JSON-LD `<script>` tags for LocalBusiness, Service, BreadcrumbList schemas | I18nProvider (localized business info), Router (current route for breadcrumbs) | NEW |
| **LanguageSwitcher** | UI for switching between en/bs/ar with proper flag icons and navigation | Router (navigate to locale-prefixed URL), I18nProvider (change language) | NEW |
| **Pre-render Pipeline** | Build-time script that renders all public routes to static HTML | Vite build output, Puppeteer, route manifest | NEW |
| **ThemeProvider** | Dark/light/system theme management (existing) | HTML root element, localStorage | EXISTING (unchanged) |
| **CRTSoundProvider** | CRT visual effects and sound (existing) | DOM, audio context | EXISTING (unchanged) |
| **Navbar** | Navigation with localized labels and locale-aware links | I18nProvider, Router, LanguageSwitcher | EXISTING (modified) |
| **Footer** | Footer links, company info, social links | I18nProvider, Router | EXISTING (modified) |
| **PageHeader** | Page hero/header with title, description, breadcrumbs | I18nProvider (translated strings), SEOHead | EXISTING (modified) |
| **Route Pages** | Individual page content | I18nProvider, SEOHead, StructuredData | EXISTING (modified) |

### Data Flow

```
1. URL PARSING (entry point)
   Browser URL: /ar/services/cloud-architecture
                  |        |
                  v        v
           locale="ar"   rest of path="/services/cloud-architecture"

2. LOCALE RESOLUTION
   URL param "ar" --> LocaleLayout beforeLoad validates -->
   Sets i18n.changeLanguage("ar") -->
   Sets document.documentElement.dir = "rtl" -->
   Sets document.documentElement.lang = "ar"

3. TRANSLATION LOADING
   i18next Backend plugin --> /public/locales/ar/common.json
                          --> /public/locales/ar/services.json
                          --> (lazy-loaded per namespace)

4. COMPONENT RENDERING (inside-out)
   Route Component:
     - Calls useTranslation('services') for page content
     - Renders <SEOHead> with translated title/description
     - Renders <StructuredData> with localized schema
     - Page body uses t('key') for all visible text

   Layout (LocaleLayout):
     - dir="rtl" applied to wrapper
     - Tailwind logical properties (ps-4, pe-4, ms-2, me-2) auto-flip
     - rtl: variant used for edge cases (icon positions, etc.)

   Navbar/Footer:
     - All labels from t() function
     - Links include locale prefix: to={`/${locale}/about`}
     - LanguageSwitcher in navbar actions area

5. PRE-RENDERING (build time only)
   vite build --> dist/ -->
   Pre-render script with Puppeteer -->
     For each locale (en, bs, ar):
       For each public route (/about, /services/*, /contact, etc.):
         Navigate to /${locale}/${route}
         Wait for content render
         Extract HTML
         Write to dist/${locale}/${route}/index.html
   --> Deploy dist/ to Azure Static Web Apps
```

---

## Component Architecture Details

### 1. I18n Provider Stack

**Confidence: HIGH** (verified via Context7: `/i18next/react-i18next`)

```
src/
  i18n/
    index.ts              # i18next initialization
    config.ts             # Supported locales, default locale, namespace list
    types.ts              # TypeScript types for locale codes, namespace keys
  public/
    locales/
      en/
        common.json       # Shared: nav, footer, buttons, labels
        services.json     # Service page content
        landing.json      # Landing page content
        seo.json          # Meta titles, descriptions, OG tags
      bs/
        common.json
        services.json
        landing.json
        seo.json
      ar/
        common.json
        services.json
        landing.json
        seo.json
```

**i18n initialization approach:**

```typescript
// src/i18n/config.ts
export const SUPPORTED_LOCALES = ['en', 'bs', 'ar'] as const
export type Locale = typeof SUPPORTED_LOCALES[number]
export const DEFAULT_LOCALE: Locale = 'en'
export const RTL_LOCALES: Locale[] = ['ar']

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  bs: 'Bosanski',
  ar: 'العربية',
}

export const NAMESPACES = ['common', 'services', 'landing', 'seo'] as const
```

```typescript
// src/i18n/index.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import Backend from 'i18next-http-backend'
import { DEFAULT_LOCALE, NAMESPACES } from './config'

i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    fallbackLng: DEFAULT_LOCALE,
    defaultNS: 'common',
    ns: [...NAMESPACES],
    interpolation: { escapeValue: false },
    react: { useSuspense: true },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
  })

export default i18n
```

**Key design decision:** No `i18next-browser-languagedetector`. The URL is the single source of truth for language. The locale is extracted from the route param and explicitly set via `i18n.changeLanguage(locale)`. This prevents mismatches between URL language and displayed language.

### 2. Route Structure with `{-$locale}` Optional Param

**Confidence: HIGH** (verified via Context7: `/tanstack/router` -- official docs show exact i18n file-based routing pattern)

TanStack Router supports optional path parameters using `{-$paramName}` syntax. This means:
- `/about` matches (locale is `undefined`, defaults to `'en'`)
- `/en/about` matches (locale is `'en'`)
- `/bs/about` matches (locale is `'bs'`)
- `/ar/about` matches (locale is `'ar'`)

**File structure transformation:**

```
CURRENT:                          AFTER:
src/routes/                       src/routes/
  __root.tsx                        __root.tsx           (unchanged)
  index.tsx                         {-$locale}/
  about.tsx                           index.tsx          (was: index.tsx)
  contact.tsx                         about.tsx          (was: about.tsx)
  services/                           contact.tsx        (was: contact.tsx)
    enterprise-software-dev.tsx       services/
    ai-ml-business-intelligence.tsx     enterprise-software-dev.tsx
    cloud-architecture.tsx              ai-ml-business-intelligence.tsx
    ...                                 cloud-architecture.tsx
  login.tsx                             ...
  register.tsx                    login.tsx              (NO locale prefix)
  admin/                          register.tsx           (NO locale prefix)
    index.tsx                     admin/                 (NO locale prefix)
                                    index.tsx
```

**Critical design decision:** Auth routes (`login`, `register`, `forgot-password`, `reset-password`, `confirm-email`, `auth.callback`, `first-time-setup`), admin routes, profile, and other app-internal routes do NOT get locale prefixes. Only public-facing, SEO-relevant pages get the `{-$locale}` prefix.

**The LocaleLayout route:**

```typescript
// src/routes/{-$locale}.tsx  (layout route for all locale-prefixed pages)
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, RTL_LOCALES } from '@/i18n/config'
import type { Locale } from '@/i18n/config'
import i18n from '@/i18n'

export const Route = createFileRoute('/{-$locale}')({
  beforeLoad: ({ params }) => {
    const locale = (params.locale as Locale) || DEFAULT_LOCALE

    // Validate locale
    if (params.locale && !SUPPORTED_LOCALES.includes(params.locale as Locale)) {
      throw new Error('Invalid locale')  // Will trigger 404/error boundary
    }

    // Sync i18n language
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale)
    }

    // Set document direction and lang
    const isRTL = RTL_LOCALES.includes(locale)
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
    document.documentElement.lang = locale

    return { locale, isRTL }
  },
  component: LocaleLayout,
})

function LocaleLayout() {
  return <Outlet />
}
```

### 3. RTL Layout Strategy

**Confidence: HIGH** (verified via Tailwind CSS official docs for `rtl:` and `ltr:` variants and logical properties)

**Three-tier approach:**

**Tier 1: CSS Logical Properties (automatic, covers ~90% of cases)**

Tailwind CSS v4 supports logical property utilities. Replace physical direction utilities with logical ones throughout the codebase:

| Physical (current) | Logical (new) | Effect |
|--------------------|--------------:|--------|
| `ml-3` | `ms-3` | margin-inline-start |
| `mr-3` | `me-3` | margin-inline-end |
| `pl-4` | `ps-4` | padding-inline-start |
| `pr-4` | `pe-4` | padding-inline-end |
| `left-0` | `start-0` | inset-inline-start |
| `right-0` | `end-0` | inset-inline-end |
| `text-left` | `text-start` | text-align: start |
| `text-right` | `text-end` | text-align: end |
| `rounded-l-md` | `rounded-s-md` | border-start-radius |
| `rounded-r-md` | `rounded-e-md` | border-end-radius |
| `border-l` | `border-s` | border-inline-start |
| `border-r` | `border-e` | border-inline-end |

**Tier 2: RTL/LTR Variants (for edge cases, ~8% of cases)**

For cases where logical properties alone are insufficient (e.g., icons that need to flip, gradients, transforms):

```html
<div class="ltr:ml-3 rtl:mr-3">...</div>
<ArrowRight class="ltr:rotate-0 rtl:rotate-180" />
```

The `rtl:` and `ltr:` variants in Tailwind v4 match via:
```css
rtl: &:where(:dir(rtl), [dir="rtl"], [dir="rtl"] *)
ltr: &:where(:dir(ltr), [dir="ltr"], [dir="ltr"] *)
```

They respond to the `dir` attribute set on `<html>` by the LocaleLayout.

**Tier 3: Component-level overrides (rare, ~2%)**

For complex layouts like the globe visualization, CRT effects, or Three.js canvas that should NOT be RTL-mirrored, explicitly set `dir="ltr"` on those containers:

```html
<div dir="ltr">
  <!-- Globe/3D canvas always LTR regardless of page direction -->
  <GlobeVisualization />
</div>
```

**Font considerations for Arabic:**

Arabic text requires different font handling. Add an Arabic-optimized font stack:

```css
/* In styles.css */
:lang(ar) {
  font-family: 'Noto Sans Arabic', 'Segoe UI', 'Tahoma', sans-serif;
}
```

### 4. SEO Head Component (React 19 Native)

**Confidence: HIGH** (verified via react.dev official docs for `<title>` and `<meta>` components)

React 19 natively supports rendering `<title>` and `<meta>` tags from any component, automatically hoisting them to `<head>`. No third-party library needed.

```typescript
// src/components/seo/SEOHead.tsx
interface SEOHeadProps {
  titleKey: string         // i18n key for <title>
  descriptionKey: string   // i18n key for meta description
  namespace?: string       // i18n namespace
  ogImagePath?: string     // Open Graph image path
  canonicalPath?: string   // Path without locale prefix
  pageType?: 'website' | 'article'
}

function SEOHead({ titleKey, descriptionKey, namespace = 'seo', ogImagePath, canonicalPath, pageType = 'website' }: SEOHeadProps) {
  const { t } = useTranslation(namespace)
  const { locale } = Route.useParams()  // From parent locale layout
  const currentLocale = locale || DEFAULT_LOCALE
  const baseUrl = 'https://horizontech.ba'
  const path = canonicalPath || window.location.pathname

  return (
    <>
      <title>{t(titleKey)}</title>
      <meta name="description" content={t(descriptionKey)} />

      {/* Open Graph */}
      <meta name="og:title" content={t(titleKey)} />
      <meta name="og:description" content={t(descriptionKey)} />
      <meta name="og:type" content={pageType} />
      <meta name="og:url" content={`${baseUrl}/${currentLocale}${path}`} />
      {ogImagePath && <meta name="og:image" content={`${baseUrl}${ogImagePath}`} />}
      <meta name="og:locale" content={currentLocale} />

      {/* Hreflang alternates for SEO */}
      {SUPPORTED_LOCALES.map(lang => (
        <link key={lang} rel="alternate" hrefLang={lang} href={`${baseUrl}/${lang}${canonicalPath || ''}`} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={`${baseUrl}${canonicalPath || ''}`} />

      {/* Canonical */}
      <link rel="canonical" href={`${baseUrl}/${currentLocale}${canonicalPath || ''}`} />
    </>
  )
}
```

**Important limitation:** React 19 `<meta>` requires exactly one of `name`, `charset`, `httpEquiv`, or `itemProp`. For Open Graph tags (which use the `property` attribute, not `name`), the `<meta>` component may not hoist automatically. Two mitigation approaches:

1. Use `name` attribute for OG tags (some search engines accept this)
2. For critical OG tags, also include them in the pre-rendered HTML template

### 5. Structured Data (JSON-LD)

**Confidence: MEDIUM** (pattern well-established in React ecosystem; no React 19-specific JSON-LD library verified)

```typescript
// src/components/seo/StructuredData.tsx
interface StructuredDataProps {
  data: Record<string, unknown>
}

function StructuredData({ data }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),  // XSS prevention
      }}
    />
  )
}
```

**Schema types needed:**

| Schema | Pages | Purpose |
|--------|-------|---------|
| `LocalBusiness` | All pages (in footer/layout) | Company info, address, hours, logo |
| `WebSite` | Home page | Site-level search, name |
| `Service` | Each service page | Service name, description, provider |
| `BreadcrumbList` | All pages with breadcrumbs | Navigation hierarchy for rich snippets |
| `Organization` | About page | Detailed company info, founders, social |
| `FAQPage` | FAQ section/page | FAQ rich snippets |

**Localized structured data pattern:**

```typescript
// In a service page
function CloudArchitecturePage() {
  const { t } = useTranslation('services')
  const { locale } = Route.useParams()

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: t('cloud.title'),
    description: t('cloud.description'),
    provider: {
      '@type': 'Organization',
      name: 'Horizon Tech d.o.o.',
      url: 'https://horizontech.ba',
    },
    areaServed: { '@type': 'Country', name: 'Bosnia and Herzegovina' },
    inLanguage: locale || 'en',
  }

  return (
    <>
      <SEOHead titleKey="cloud.meta.title" descriptionKey="cloud.meta.description" />
      <StructuredData data={serviceSchema} />
      {/* Page content */}
    </>
  )
}
```

### 6. Pre-rendering Pipeline

**Confidence: MEDIUM** (vite-plugin-prerender exists but is lightly maintained; custom Puppeteer script is a proven pattern with multiple references)

**Strategy:** Build-time pre-rendering via a custom Node.js script using Puppeteer. Runs after `vite build` and generates static HTML files for each locale + route combination.

**Why not vite-plugin-prerender?** The plugin (v1.0.7, last updated August 2022) is functional but not actively maintained. A custom script provides more control over locale-specific rendering, `<html dir>` attributes, and integration with the Azure Static Web Apps deployment pipeline.

**Pre-render script architecture:**

```
npm run build              # Standard Vite build -> dist/
npm run prerender          # Custom script -> dist/ (augmented with HTML files)

prerender script:
  1. Read route manifest (list of public routes to pre-render)
  2. Start local static server serving dist/
  3. For each locale in [en, bs, ar]:
     For each route in manifest:
       - Launch Puppeteer page
       - Navigate to http://localhost:PORT/${locale}${route}
       - Wait for app to render (document event or selector)
       - Extract full HTML
       - Write to dist/${locale}${route}/index.html
  4. Generate sitemap.xml with all locale/route combinations
  5. Stop local server
```

**Route manifest:**

```typescript
// scripts/prerender-routes.ts
export const PRERENDER_ROUTES = [
  '/',
  '/about',
  '/team',
  '/careers',
  '/contact',
  '/blog',
  '/case-studies',
  '/education',
  '/support',
  '/privacy',
  '/terms',
  '/services/enterprise-software-development',
  '/services/ai-ml-business-intelligence',
  '/services/cloud-architecture',
  '/services/iot-edge-computing',
  '/services/devops-platform-engineering',
  '/services/digital-transformation',
  '/innovation-lab',
]

// Auth routes (login, register, etc.) are NOT pre-rendered
// Admin routes are NOT pre-rendered
// Profile route is NOT pre-rendered
```

**Output structure:**

```
dist/
  index.html              # SPA shell (fallback)
  assets/                 # JS, CSS chunks
  locales/                # Translation JSON files
  en/
    index.html            # Pre-rendered /en/
    about/index.html      # Pre-rendered /en/about
    services/
      cloud-architecture/index.html
      ...
  bs/
    index.html            # Pre-rendered /bs/
    about/index.html      # Pre-rendered /bs/about (in Bosnian)
    ...
  ar/
    index.html            # Pre-rendered /ar/ (RTL)
    about/index.html      # Pre-rendered /ar/about (RTL)
    ...
  sitemap.xml             # Multi-language sitemap
  robots.txt              # Points to sitemap
```

### 7. Azure Static Web Apps Configuration

**Confidence: HIGH** (existing staticwebapp.config.json reviewed; Azure SWA docs well-known)

The existing `staticwebapp.config.json` needs modification to serve pre-rendered HTML for locale-prefixed paths while maintaining SPA fallback behavior.

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": [
      "/*.{css,scss,js,json,ico,png,jpg,jpeg,gif,svg,webp,woff,woff2,ttf,eot,xml,txt}",
      "/assets/*",
      "/locales/*",
      "/api/*"
    ]
  },
  "routes": [
    {
      "route": "/en/*",
      "rewrite": "/en/index.html"
    },
    {
      "route": "/bs/*",
      "rewrite": "/bs/index.html"
    },
    {
      "route": "/ar/*",
      "rewrite": "/ar/index.html"
    }
  ],
  "responseOverrides": {
    "404": {
      "rewrite": "/index.html",
      "statusCode": 200
    }
  },
  "globalHeaders": {
    "Cache-Control": "no-cache",
    "X-Content-Type-Options": "nosniff"
  },
  "mimeTypes": {
    ".json": "application/json",
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".xml": "application/xml"
  }
}
```

**Important note on Azure SWA and pre-rendered files:** Azure Static Web Apps serves static files first if they exist at the exact path. Since the pre-render script writes `dist/en/about/index.html`, a request to `/en/about` will be served the pre-rendered HTML directly. If the file doesn't exist (e.g., for a dynamic route or auth page), the navigation fallback kicks in and serves the SPA shell. This is the desired behavior -- crawlers get pre-rendered HTML with full content, users get the SPA experience.

---

## Patterns to Follow

### Pattern 1: Locale-Aware Link Component

**What:** A wrapper around TanStack Router's `Link` that automatically includes the current locale prefix.
**When:** Every internal navigation link on public-facing pages.

```typescript
// src/components/LocaleLink.tsx
import { Link, type LinkProps } from '@tanstack/react-router'
import { useLocale } from '@/hooks/useLocale'
import { DEFAULT_LOCALE } from '@/i18n/config'

interface LocaleLinkProps extends Omit<LinkProps, 'to'> {
  to: string  // Path without locale prefix, e.g., '/about'
}

function LocaleLink({ to, ...props }: LocaleLinkProps) {
  const locale = useLocale()
  const localizedPath = locale === DEFAULT_LOCALE ? to : `/${locale}${to}`
  return <Link to={localizedPath} {...props} />
}
```

### Pattern 2: Translation Key Co-location

**What:** Each page component declares its translation namespace at the top level, and the translation JSON structure mirrors the component tree.
**When:** Every translatable component.

```typescript
// In route component:
function AboutPage() {
  const { t } = useTranslation('about')  // loads /locales/{lang}/about.json
  return <h1>{t('hero.title')}</h1>
}

// In /public/locales/en/about.json:
{
  "hero": {
    "title": "About Horizon Tech",
    "subtitle": "Our mission, vision, and story"
  },
  "meta": {
    "title": "About Us | Horizon Tech",
    "description": "Learn about Horizon Tech..."
  }
}
```

### Pattern 3: SEO Component Per Page

**What:** Every public-facing route renders `<SEOHead>` and optionally `<StructuredData>` at the top of its component tree.
**When:** All locale-prefixed routes.

```typescript
function ServicePage() {
  return (
    <>
      <SEOHead
        titleKey="enterprise.meta.title"
        descriptionKey="enterprise.meta.description"
        canonicalPath="/services/enterprise-software-development"
      />
      <StructuredData data={serviceSchema} />
      {/* Visible page content */}
    </>
  )
}
```

### Pattern 4: Translated Route Slugs (Bosnian only)

**What:** For Bosnian, service page URLs use translated slugs (`/bs/usluge/ai` instead of `/bs/services/ai`).
**When:** Public-facing Bosnian routes where SEO benefits from localized URLs.

**Implementation approach:** This requires a URL rewriting layer. The most pragmatic approach is a redirect map in the pre-render script and in the router's `beforeLoad`:

```typescript
// src/i18n/route-slugs.ts
export const ROUTE_SLUGS: Record<string, Record<string, string>> = {
  bs: {
    '/services': '/usluge',
    '/services/enterprise-software-development': '/usluge/razvoj-softvera',
    '/services/ai-ml-business-intelligence': '/usluge/ai-ml-poslovna-inteligencija',
    '/services/cloud-architecture': '/usluge/cloud-arhitektura',
    // ... etc
    '/about': '/o-nama',
    '/contact': '/kontakt',
    '/careers': '/karijere',
    '/team': '/tim',
  },
  // ar and en use English slugs (Arabic script in URLs is problematic for SEO)
}
```

**Design decision for Arabic URLs:** Arabic script in URLs creates encoding issues, poor readability, and SEO complications. Arabic locale uses English slugs (`/ar/services/cloud-architecture`), with all content in Arabic. This is standard practice for Arabic websites.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Language Detection from Browser Headers
**What:** Using `navigator.language` or `Accept-Language` headers to auto-detect and redirect.
**Why bad:** Creates inconsistency between URL and content. Google crawls with `en-US` headers but needs to index Bosnian pages. Users sharing links get unexpected language switches. Breaks pre-rendering determinism.
**Instead:** URL is the single source of truth. Default to `en` when no locale prefix exists. Provide clear language switcher UI.

### Anti-Pattern 2: Client-Side Only Structured Data
**What:** Injecting JSON-LD only via React without pre-rendering.
**Why bad:** Google's crawler can execute JavaScript but has a secondary rendering queue that is slower and less reliable. Structured data in pre-rendered HTML is immediately available to all crawlers.
**Instead:** Pre-render all pages so structured data is present in the static HTML.

### Anti-Pattern 3: Duplicating All Route Files Per Locale
**What:** Creating separate route files like `routes/en/about.tsx`, `routes/bs/about.tsx`, `routes/ar/about.tsx`.
**Why bad:** Triplicates the codebase. Changes must be made in 3 places. TanStack Router's `{-$locale}` optional param eliminates this need entirely.
**Instead:** Single `routes/{-$locale}/about.tsx` with locale from params and content from i18n.

### Anti-Pattern 4: Translating Inside Component Bodies
**What:** Hardcoding translation lookups like `locale === 'bs' ? 'O nama' : 'About Us'`.
**Why bad:** Unmaintainable at scale. No translator workflow. Cannot extract for translation tools.
**Instead:** All visible text goes through `t('key')` from i18next, with translations in JSON files.

### Anti-Pattern 5: Global RTL Class Toggle
**What:** Adding a global `.rtl` CSS class and writing custom RTL overrides for every component.
**Why bad:** Fights the browser's native BiDi algorithm. Tailwind's logical properties and `dir` attribute handle this natively and correctly.
**Instead:** Set `dir="rtl"` on `<html>`, use Tailwind logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`), use `rtl:` variant only for edge cases.

### Anti-Pattern 6: Pre-rendering Without Fallback
**What:** Only deploying pre-rendered HTML without the SPA shell.
**Why bad:** Dynamic routes (auth, admin, user-specific pages) need the SPA. Pre-rendered pages need hydration for interactivity.
**Instead:** Deploy both pre-rendered HTML AND the SPA shell. Azure SWA serves pre-rendered files when they exist and falls back to `index.html` otherwise.

---

## Build Order and Dependencies

The following dependency graph determines the implementation sequence. Components lower in the list depend on components above them.

```
LAYER 0 (No dependencies - can be built first)
  |
  +-- i18n configuration (src/i18n/config.ts, types)
  +-- Translation JSON files (public/locales/en/*.json)
  +-- SEOHead component (pure React 19, no i18n dependency initially)
  +-- StructuredData component (pure React, no dependencies)

LAYER 1 (Depends on Layer 0)
  |
  +-- i18next initialization (src/i18n/index.ts) -- depends on config
  +-- I18nProvider integration in main.tsx -- depends on i18n init
  +-- useLocale hook -- depends on Router params + i18n config
  +-- LocaleLink component -- depends on useLocale hook

LAYER 2 (Depends on Layer 1)
  |
  +-- LocaleLayout route (routes/{-$locale}.tsx) -- depends on i18n, config
  +-- Route restructuring (move files into {-$locale}/ directory)
  +-- LanguageSwitcher component -- depends on useLocale, LocaleLink

LAYER 3 (Depends on Layer 2)
  |
  +-- Navbar modification (translate labels, add LanguageSwitcher)
  +-- Footer modification (translate labels)
  +-- RTL CSS migration (logical properties throughout codebase)
  +-- Arabic font integration

LAYER 4 (Depends on Layer 3)
  |
  +-- Page-by-page i18n integration (extract strings, add SEOHead)
  +-- Translation files for bs and ar locales
  +-- Structured data per page

LAYER 5 (Depends on Layer 4 -- can run in parallel with Layer 4)
  |
  +-- Pre-render script (scripts/prerender.ts)
  +-- Sitemap generation
  +-- Azure SWA config updates (staticwebapp.config.json)
  +-- Build pipeline integration (npm run build && npm run prerender)

LAYER 6 (Depends on Layer 5)
  |
  +-- Translated route slugs for Bosnian (/bs/usluge/...)
  +-- hreflang cross-references validation
  +-- Pre-render smoke tests
```

### Phase Structure Implications

**Phase 1 -- Foundation (Layers 0-1):** Install i18next + react-i18next, create config, initialize provider, create English translation files by extracting strings from existing components. No user-visible changes yet.

**Phase 2 -- Route Restructuring (Layer 2):** Move existing route files into `{-$locale}/` directory. Create LocaleLayout. This is the highest-risk change as it touches the file-based routing structure. All existing URLs continue to work (locale param is optional, defaults to English). English language switcher appears but only `en` works initially.

**Phase 3 -- RTL and UI Integration (Layer 3):** Migrate Tailwind classes to logical properties. Modify Navbar and Footer to use `t()`. Add Arabic font. Test RTL layout thoroughly.

**Phase 4 -- Content Translation (Layer 4):** Page-by-page translation integration. Add SEOHead and StructuredData to each public page. Create Bosnian and Arabic translation files. This is the longest phase -- it is labor-intensive but low-risk (each page can be done independently).

**Phase 5 -- SEO Pipeline (Layers 5-6):** Build pre-render script. Generate sitemaps. Update Azure SWA config. Add Bosnian translated slugs. Validate with Google Search Console.

---

## Scalability Considerations

| Concern | 3 Languages (current plan) | 10 Languages | 20+ Languages |
|---------|---------------------------|--------------|---------------|
| Translation files | Manual JSON files, fine | Professional translation management tool (Crowdin/Lokalise) | Mandatory TMS with translator workflow |
| Pre-render time | ~60 routes x 3 = 180 pages, ~3 min | ~600 pages, ~10 min | ~1200+ pages, parallelize with Puppeteer cluster |
| Bundle size | i18next adds ~40KB gzipped. Translations lazy-loaded per namespace | Same core size, more translation files loaded on demand | Same, consider CDN for translation files |
| Route files | Single set of route files, locale from params | Same architecture scales | Same architecture scales |
| RTL | One RTL language (Arabic) | May need more RTL (Hebrew, Persian, Urdu) | Same CSS approach, no additional complexity |
| Azure SWA limits | Free tier: 250MB storage, well within | May approach storage limits with pre-rendered HTML | Consider Azure CDN for overflow |

---

## Sources

### HIGH Confidence (Context7 / Official Documentation)
- TanStack Router optional path params and i18n routing: [Context7: /tanstack/router](https://github.com/tanstack/router/blob/main/docs/router/framework/react/guide/path-params.md)
- TanStack Router file-based routing: [TanStack Router Docs](https://tanstack.com/router/latest/docs/framework/react/routing/file-based-routing)
- react-i18next setup and hooks: [Context7: /i18next/react-i18next](https://context7.com/i18next/react-i18next/llms.txt)
- React 19 `<title>` component: [react.dev](https://react.dev/reference/react-dom/components/title)
- React 19 `<meta>` component: [react.dev](https://react.dev/reference/react-dom/components/meta)
- Tailwind CSS RTL variants (`rtl:`, `ltr:`): [Tailwind CSS Docs](https://tailwindcss.com/docs/hover-focus-and-other-states#rtl-support)

### MEDIUM Confidence (Official sources via WebFetch / Multiple sources agree)
- vite-plugin-prerender configuration: [GitHub README](https://github.com/Rudeus3Greyrat/vite-plugin-prerender)
- JSON-LD structured data in React: [LogRocket](https://blog.logrocket.com/improving-react-seo-structured-data/), [Google react-schemaorg](https://github.com/google/react-schemaorg)
- Azure Static Web Apps pre-rendering approach: [GitHub Issue #196](https://github.com/Azure/static-web-apps/issues/196)
- react-helmet-async React 19 incompatibility: [GitHub Issue #239](https://github.com/staylor/react-helmet-async/issues/239)

### LOW Confidence (WebSearch only, needs validation)
- Bosnian translated URL slugs SEO benefit -- needs validation with actual Google Search Console data
- Pre-render script timing estimates -- depends on page complexity and Puppeteer configuration
