# Project Research Summary

**Project:** Horizon Tech Corporate Website - i18n, SEO, and Multi-Language Support
**Domain:** Corporate tech services website with internationalization and SEO optimization
**Researched:** 2026-02-07
**Confidence:** HIGH

## Executive Summary

This project transforms an existing React 19 + TanStack Router SPA into a production-ready corporate website with comprehensive internationalization (English, Bosnian, Arabic) and SEO infrastructure. The core technical challenge is integrating three interconnected concerns: i18n with language-prefixed URLs, RTL layout support, and build-time pre-rendering for search engine visibility, all while maintaining the existing SPA architecture and deployment to Azure Static Web Apps.

The recommended approach uses i18next + react-i18next for internationalization with TanStack Router's optional path parameter syntax (`{-$locale}`) for clean URL structure. SEO is achieved through React 19's native document metadata hoisting combined with build-time pre-rendering using a custom Puppeteer-based script. RTL support leverages Tailwind CSS v4's built-in logical properties (`ms-*`, `me-*`, `start-*`, `end-*`) which automatically flip in RTL mode. This stack integrates cleanly with the existing TanStack ecosystem without requiring migration to SSR frameworks like Next.js or TanStack Start.

The primary risks are pre-rendering tool selection (react-snap is abandoned and incompatible with React 19/Vite 6), routing architecture errors (language-prefixed routing can break TanStack Router's file-based routing if implemented incorrectly), and RTL migration complexity (shadcn/ui added RTL support in January 2026, but third-party component registries may lag behind). These risks are mitigated through early proof-of-concept validation, using TanStack Router's native rewrite API instead of filesystem nesting, and creating an RTL test page to audit all UI components before building Arabic-facing pages.

## Key Findings

### Recommended Stack

The existing production stack (React 19, TanStack Router, TanStack Query, Tailwind CSS v4, Vite, shadcn/ui) remains unchanged. New additions focus on i18n, SEO, and pre-rendering capabilities.

**Core technologies:**

- **i18next + react-i18next** (^25.8.4 / ^16.5.4): Industry-standard i18n framework with 25M+ weekly downloads. Handles Arabic's 6 plural forms natively, provides RTL direction detection via `i18n.dir()`, supports namespace-based lazy loading, and has full React 19 compatibility. No credible alternative comes close for a React SPA.

- **i18next-resources-to-backend** (^1.2.1): Vite-native lazy loading for translation JSON files via dynamic imports. Translations are bundled as code-split chunks with hash caching, avoiding runtime HTTP requests. Critical for Azure Static Web Apps where there's no backend to serve `/locales/` files.

- **React 19 native document metadata**: Built-in `<title>` and `<meta>` component hoisting eliminates the need for react-helmet (unmaintained) or react-helmet-async (doesn't support React 19). This is the endorsed path from TanStack Router documentation.

- **react-schemaorg + schema-dts** (^2.0.0 / ^1.1.5): Google-maintained packages for type-safe JSON-LD structured data. Provides TypeScript autocomplete for all Schema.org types (Organization, Service, LocalBusiness, FAQPage). Essential for rich snippets in Google Search.

- **vite-plugin-prerender** (^1.0.8): Build-time pre-rendering using Puppeteer to generate static HTML for each route. Integrates as a Vite plugin. CAVEAT: Last published 2 years ago, but functional. Fallback is Prerender.io SaaS ($90/mo) if build-time approach proves fragile.

- **vite-plugin-sitemap** (^0.8.2): Build-time sitemap.xml and robots.txt generation with native i18n support (hreflang alternate links). Scans dist folder and generates multilingual sitemaps automatically.

**RTL support** requires no additional libraries. Tailwind CSS v4's built-in logical property utilities (`ms-4`, `ps-4`, `start-0`, `text-start`) automatically flip in RTL mode when `dir="rtl"` is set on `<html>`. The `rtl:` and `ltr:` variant modifiers handle edge cases.

**Critical version notes:**
- i18next browser language detector is intentionally NOT used. The URL is the single source of truth for language to prevent redirect traps that confuse search engines.
- Arabic requires a specific font stack (Noto Sans Arabic, Cairo) loaded conditionally per locale.

### Expected Features

Based on analysis of corporate IT services websites, 15 features emerge as required for credibility and lead generation. These are divided into table stakes (must-have for professionalism) and differentiators (competitive advantages).

**Must have (table stakes):**

- **SEO Infrastructure** (TS-6): Per-route meta tags (title, description, Open Graph), JSON-LD structured data (Organization, Service, LocalBusiness), sitemap.xml, robots.txt, and hreflang tags for multilingual SEO. Without this, the SPA is invisible to search engines.

- **Pre-rendering** (TS-7): Build-time static HTML generation for all public routes. Google can execute JavaScript but it's slower and less reliable. Pre-rendering gives crawlers real content immediately. PROJECT.md explicitly mandates this.

- **Service Pages with Dedicated URLs** (TS-2): One URL per service for SEO targeting. Each page needs benefit-oriented copy, tech stack, process explanation, FAQ section, and embedded CTAs. Structured data (Service schema) per page.

- **Contact Form Wired to Backend** (TS-4): The existing contact form simulates submission with `setTimeout`. Must wire to actual backend API with validation, honeypot spam protection, and trust signals near submit button.

- **Social Proof** (TS-3): Real client logos, testimonials with name/role/company/headshot, stat counters. 90% of B2B buyers are influenced by social proof. Adding client logos can increase conversions by 400%.

- **Navigation with Clear Information Architecture** (TS-8): Services mega-menu/dropdown, clear primary navigation, persistent "Get in Touch" CTA in header, breadcrumbs on inner pages for SEO.

- **Responsive Mobile Experience** (TS-5): 83% of landing page visits are on mobile. Must audit 3D globe performance on mobile (may need to hide or simplify), ensure CRT effects don't break mobile layouts.

- **Legal Pages** (TS-11): Privacy Policy and Terms covering GDPR compliance (data processing, cookies, contact form data handling). Required for EU visitors and professional credibility.

**Should have (competitive differentiators):**

- **i18n with Multi-Language URL Structure** (D-4): English, Bosnian, Arabic with locale-prefixed URLs (`/en/`, `/bs/`, `/ar/`). Creates SEO advantages in underserved search markets. Most small/mid IT services companies are English-only. HIGH COMPLEXITY - this is the single most complex feature.

- **Localized SEO** (D-5): Multilingual sitemap with hreflang annotations, `<link rel="alternate" hreflang="x">` in `<head>` for every page. Tells Google which language version to show in which market.

- **CRT / Retro-Futuristic Aesthetic** (D-1): The existing CRT boot sequence, scanlines, phosphor glow, DecryptedText effect create immediate memorability. No other IT consulting firm has this visual language. Signals technical depth through the medium itself.

- **Interactive 3D Globe** (D-2): Communicates "global presence" more powerfully than a flat map. Interactive element increases engagement time. Few dev shops invest in Three.js on their marketing site.

- **Innovation Lab / Live Demos** (D-3): The existing `/innovation-lab` with NLP demos and genetic algorithm visualization. Most IT services sites TELL you what they can do. Horizon Tech SHOWS you. This is the "show, don't tell" differentiator.

- **Embedded CTAs Throughout All Pages** (D-6): Contextual CTAs on every service page ("Discuss your AI project" on AI page, "Get a free cloud assessment" on cloud page). Captures intent at the moment of interest. Most dev shop sites have a single contact page.

- **FAQ Sections with Schema Markup** (D-7): Per-service FAQs with FAQPage structured data target Google's "People also ask" featured snippets. Service-specific questions are SEO gold for long-tail queries.

- **Performance Optimization** (D-8): Google uses Core Web Vitals (LCP, FID, CLS) as ranking signals. Three.js and CRT effects are performance-heavy. Optimizing them while maintaining the aesthetic is a technical differentiator.

**Defer (v2+):**

- **Blog** (AF-3): PROJECT.md explicitly marks blog as out of scope. A blog with 2-3 posts looks worse than no blog. Focus on service page copy and FAQ sections first.

- **Arabic RTL Full Implementation**: Build i18n infrastructure with EN + BS first, add Arabic RTL as follow-up once routing and translation patterns are validated.

- **Additional Innovation Lab Demos**: Nice to have, not blocking lead generation.

### Architecture Approach

The architecture introduces five new system components that integrate with the existing React 19 + TanStack Router + Tailwind CSS v4 stack without requiring changes to the core application structure.

**Major components:**

1. **I18nProvider (NEW)** — Initializes i18next, manages current language, loads translation files on demand using `i18next-resources-to-backend` with Vite dynamic imports. Provides `t()` function to all UI components. Uses namespace-based organization (common.json, services.json, landing.json, seo.json) to avoid loading all translations upfront.

2. **LocaleLayout route (NEW)** — `routes/{-$locale}.tsx` layout route using TanStack Router's optional path parameter syntax. Extracts `$locale` param from URL (`/bs/about` → locale="bs"), validates against allowed locales, syncs i18n language via `i18n.changeLanguage()`, sets `document.documentElement.dir` ("rtl" or "ltr"), and sets `document.documentElement.lang`. All public-facing routes nest under this layout.

3. **SEOHead component (NEW)** — Renders `<title>`, `<meta>`, Open Graph tags, and `<link rel="alternate" hreflang>` per page using React 19's native document metadata hoisting. Receives translation keys (titleKey, descriptionKey) and namespace, renders localized content. Generates hreflang tags for all language variants plus x-default fallback. Includes canonical URL per page.

4. **StructuredData component (NEW)** — Renders JSON-LD `<script type="application/ld+json">` tags for Schema.org types (Organization, LocalBusiness, Service, BreadcrumbList, FAQPage). Receives structured data object as prop, sanitizes for XSS prevention, injects into DOM. Critical schemas: Organization (all pages in footer/layout), Service (each service page), BreadcrumbList (all pages with breadcrumbs), FAQPage (FAQ sections).

5. **Pre-render Pipeline (NEW)** — Build-time Node.js script using Puppeteer that runs after `vite build`. Starts local static server serving dist/, navigates to each locale + route combination (en, bs, ar × ~20 public routes = ~60 pages), waits for app to render, extracts full HTML, writes to `dist/${locale}/${route}/index.html`. Generates sitemap.xml with all locale/route combinations. Deployed alongside SPA shell to Azure Static Web Apps.

**Key architectural decisions:**

- **No filesystem route nesting**: Routes stay at their normal paths (`routes/about.tsx`), not duplicated per language (`routes/en/about.tsx`, `routes/bs/about.tsx`). The `{-$locale}` optional param handles URL structure without triplicating code.

- **URL is single source of truth for language**: No auto-detection from `Accept-Language` headers or `navigator.language`. Prevents redirect traps that confuse Googlebot. Users get a language suggestion banner, not an automatic redirect.

- **Pre-render each language variant separately**: `/en/about`, `/bs/about`, `/ar/about` each get their own pre-rendered HTML file with correct `lang` and `dir` attributes. Prevents hydration mismatches where pre-rendered HTML is in one language but client boots in another.

- **RTL via CSS logical properties, not global `.rtl` class**: Tailwind CSS v4's `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*` utilities automatically flip when `dir="rtl"` is set on `<html>`. This leverages the browser's native BiDi algorithm instead of fighting it with custom overrides.

- **Auth routes excluded from locale prefixes**: Login, register, admin, profile routes do NOT get `{-$locale}` prefix. Only public-facing SEO-relevant pages are localized. This keeps internal app routing simple.

### Critical Pitfalls

The research identified 15 pitfalls across critical, moderate, and minor severity. The top 5 critical pitfalls that could cause rewrites, major SEO damage, or fundamental architecture failures:

1. **Pre-rendering Tool Selection — react-snap Is Abandoned** — The original react-snap repository is unmaintained and incompatible with React 19, Vite 6, and modern Puppeteer. Multiple community forks exist but lack consistent maintenance. If builds break silently, pre-rendered HTML may be empty shells showing loading spinners to Googlebot. PREVENTION: Evaluate vite-plugin-prerender or build custom Puppeteer script. Create proof-of-concept pre-render pipeline in Phase 1 BEFORE building pages that depend on it. Test in actual Azure Static Web Apps build environment, not just locally.

2. **Language-Prefixed Routing Breaks TanStack Router File-Based Routing** — Adding `/en/`, `/bs/`, `/ar/` prefixes seems straightforward, but nesting all route files under `routes/en/` creates duplicate route definitions, not language variants. Route tree generation fails or produces unexpected results. PREVENTION: Use TanStack Router's optional path parameter syntax `{-$locale}` in a layout route. Keep route files at normal paths. Build and test the routing layer with all three locales BEFORE building page content.

3. **Googlebot Redirect Traps from Accept-Language Detection** — Auto-redirecting users to their detected language creates redirect chains that burn crawl budget. Googlebot sends `Accept-Language: en` — if the default language is Bosnian and you redirect English speakers, Googlebot only sees English. Google may never properly index non-English pages. PREVENTION: NEVER auto-redirect based on language detection. Show a non-intrusive language suggestion banner. Default language (English) should be served at `/` with NO redirect. Use hreflang tags to tell Google about language variants.

4. **Pre-rendered HTML and Client Hydration Mismatch with i18n** — Pre-renderer captures HTML in one language (e.g., English). Client-side React app boots, detects user's language preference, tries to render in different language. React detects DOM mismatch, causes full re-render (negating pre-rendering benefits) or visible UI corruption. Flash of English content on Bosnian pages before client hydration. PREVENTION: Pre-render EACH language variant separately with correct `lang` and `dir` attributes. Ensure i18next initializes with the SAME language the pre-rendered HTML was generated for (read from URL prefix, not browser detection).

5. **shadcn/ui RTL Migration with Existing Components and tw-animate-css** — shadcn added RTL support in January 2026 via CLI migration command. But the project has 30+ existing shadcn components using physical CSS classes (`ml-4`, `left-0`). The migration transforms these to logical properties, but tw-animate-css has a known bug where logical slide utilities don't work correctly with portal elements (Dialog, Popover, Tooltip). Third-party registries (Aceternity, cult-ui) may not be RTL-compatible. Custom CRT animations use physical directional properties the migration tool won't touch. PREVENTION: Set `"rtl": true` in components.json BEFORE adding new components. Run `shadcn migrate rtl` then manually audit each portal-based component. Audit all 7 third-party registries for RTL compatibility. Create dedicated RTL test page early.

## Implications for Roadmap

Based on research, the implementation has a clear critical path driven by dependencies. The longest dependency chain is: SEO infrastructure (Helmet/meta tags) → i18n routing with URL structure → hreflang tags → pre-rendering all language variants. This chain should drive phase ordering.

### Phase 1: SEO Foundation & Pre-rendering Proof of Concept

**Rationale:** Pre-rendering tool selection is the highest technical risk. Must validate early before building pages that depend on it. SEO infrastructure (meta tags, structured data) is foundational — everything else builds on it. This phase de-risks the two biggest unknowns.

**Delivers:**
- Working pre-rendering pipeline (custom Puppeteer script or vite-plugin-prerender)
- SEOHead component using React 19 native metadata
- StructuredData component for JSON-LD
- Sitemap generation with vite-plugin-sitemap
- Proof that pre-rendered HTML contains correct meta tags and structured data
- Updated Azure Static Web Apps config to serve pre-rendered files

**Addresses:**
- TS-6 (SEO Infrastructure)
- TS-7 (Pre-rendering)
- Validates Pitfall #1 (react-snap abandonment) and Pitfall #9 (Azure SWA routing conflicts)

**Avoids:**
- Building 20+ pages and then discovering pre-rendering doesn't work
- Azure deployment where pre-rendered files exist but are never served to crawlers

**Validation criteria:**
- Pre-render a test route, verify with `curl` that correct HTML is served
- Google Rich Results Test detects structured data in pre-rendered HTML
- Pre-rendering runs successfully in Azure DevOps / GitHub Actions build pipeline

---

### Phase 2: i18n Routing Architecture

**Rationale:** Must establish routing pattern before any translation work begins. This is the second-highest risk area. Getting TanStack Router's locale prefix handling wrong affects every page and link. Must be validated with all three locales (en, bs, ar) before proceeding.

**Delivers:**
- i18next + react-i18next installed and configured
- i18n config (supported locales, default locale, RTL locales)
- LocaleLayout route using `{-$locale}` optional path parameter
- Route restructuring (move public-facing routes into locale layout)
- useLocale hook and LocaleLink component
- English translation files created by extracting strings from existing components
- Language switcher component in navbar (English only initially)

**Uses:**
- TanStack Router's optional path parameter syntax and beforeLoad hook
- i18next-resources-to-backend for Vite-native lazy loading

**Addresses:**
- D-4 (i18n infrastructure, English only)
- Validates Pitfall #2 (routing breaks file-based routing) and Pitfall #3 (redirect traps)

**Avoids:**
- Triplicating route files per language
- URL and displayed language becoming out of sync
- Googlebot redirect traps from auto-detection

**Validation criteria:**
- Routes work with and without locale prefix: `/about` and `/en/about` both resolve
- Language switcher changes URL and content
- No automatic redirects based on browser language
- Route tree generation produces expected routes

---

### Phase 3: RTL Support & Tailwind Migration

**Rationale:** RTL migration must happen before building Arabic-facing pages. Migrating after pages are built means reworking all layouts. Light mode is currently broken (PROJECT.md notes "gray everywhere") — fix it FIRST before adding RTL complexity on top of broken visuals.

**Delivers:**
- Light mode fixed (prerequisite for RTL work)
- `"rtl": true` set in components.json
- `shadcn migrate rtl` run on existing components
- Tailwind CSS migration from physical to logical properties (ml-4 → ms-4, etc.)
- Manual audit of portal-based components (Dialog, Popover, Tooltip, DropdownMenu)
- Arabic font stack added (Noto Sans Arabic, Cairo)
- RTL test page created with every UI component for visual verification
- `dir` attribute synced with i18n language via useEffect

**Addresses:**
- D-4 (RTL support for Arabic)
- TS-5 (responsive mobile with RTL testing)
- Validates Pitfall #5 (shadcn RTL migration issues) and Pitfall #14 (CRT effects in light mode/RTL)

**Avoids:**
- Building Arabic pages on top of broken light mode
- Portal elements (dropdowns, tooltips) appearing in wrong positions
- CRT animations conflicting with RTL layout

**Validation criteria:**
- RTL test page renders correctly with `dir="rtl"`
- All dropdowns, popovers, tooltips position correctly in RTL
- CRT effects are scoped to `.dark` and don't break RTL
- Third-party registry components (Aceternity, cult-ui) tested in RTL mode

---

### Phase 4: Service Pages Enhancement & Social Proof

**Rationale:** Service pages are the primary SEO targets and lead generation pages. This phase adds SEO-critical content while i18n infrastructure from Phase 2 is fresh in memory. These pages can be built independently (no cross-dependencies), allowing parallel work.

**Delivers:**
- Enhanced service pages with SEOHead and StructuredData per page
- FAQ sections with FAQPage JSON-LD schema
- Real social proof content (client logos, testimonials, stats)
- Testimonials scattered throughout site near CTAs
- Per-service testimonials and case study snippets
- Internal cross-links between related services
- Embedded CTAs on every service page
- Open Graph tags and images for social sharing
- Structured data validation with Google Rich Results Test

**Addresses:**
- TS-2 (Service Pages with Dedicated URLs)
- TS-3 (Social Proof)
- D-6 (Embedded CTAs)
- D-7 (FAQ Sections)
- D-10 (Open Graph / Social Sharing)

**Avoids:**
- Generic stock photography (Pitfall AF-2)
- High-friction contact forms (Pitfall #10)

**Validation criteria:**
- Each service page has unique title, description, OG tags
- Google Rich Results Test detects Service and FAQPage schemas
- FAQs use service-specific questions based on keyword research
- LinkedIn/Twitter share previews show branded cards

---

### Phase 5: Translation & Content Localization

**Rationale:** With routing, RTL, and SEO infrastructure in place, this phase translates all content to Bosnian and Arabic. This is the longest phase (labor-intensive string extraction and translation) but low-risk because infrastructure is proven. Each page can be translated independently.

**Delivers:**
- Translation namespace structure finalized (common, services, landing, seo)
- All user-facing strings extracted from components into translation keys
- Bosnian translation files (common.json, services.json, landing.json, seo.json)
- Arabic translation files
- Translated route slugs for Bosnian (`/bs/usluge/cloud-arhitektura`)
- Language switcher shows all three languages
- Localized meta tags and structured data per language
- hreflang tags generated programmatically for all pages

**Addresses:**
- D-4 (i18n full implementation with all languages)
- D-5 (Localized SEO with hreflang)
- Validates Pitfall #6 (flat keys vs. namespaces) and Pitfall #7 (hreflang errors)

**Avoids:**
- Flat key architecture that becomes unmaintainable
- hreflang implementation errors (missing self-referential tags, incorrect ISO codes)
- Text expansion breaking layouts (Pitfall #11)

**Validation criteria:**
- All pages accessible in en, bs, ar with correct content
- hreflang tags validated with Google Search Console and third-party validators
- Layouts tested with longest language variant at all breakpoints
- Google indexes all three language variants separately

---

### Phase 6: Full Pre-rendering & Performance Optimization

**Rationale:** With all content and languages complete, pre-render the entire site. This phase generates ~60 static HTML files (20 routes × 3 languages) and optimizes Core Web Vitals. Pre-rendering timing estimates and performance tuning happen here.

**Delivers:**
- Pre-render script extended to handle all locale/route combinations
- Pre-rendered HTML for all public routes (en, bs, ar variants)
- Multilingual sitemap.xml with hreflang annotations
- robots.txt pointing to sitemap
- Performance optimization pass (lazy load Three.js globe, defer CRT animations, preload critical fonts)
- Core Web Vitals measurement and optimization
- Build pipeline integration (`npm run build && npm run prerender`)
- Azure Static Web Apps deployment with pre-rendered files

**Addresses:**
- TS-7 (Pre-rendering all language variants)
- D-8 (Performance Optimization / Core Web Vitals)
- Validates Pitfall #4 (hydration mismatch) and Pitfall #8 (structured data in pre-rendered HTML)

**Avoids:**
- Pre-rendering without fallback (Pitfall anti-pattern #6)
- Structured data not present in pre-rendered HTML

**Validation criteria:**
- `curl` against deployed URLs returns correct pre-rendered HTML per language
- Google Search Console shows pre-rendered pages indexed with correct content
- Core Web Vitals scores meet thresholds (LCP < 2.5s, CLS < 0.1, FID < 100ms)
- Pre-rendering completes in reasonable time (~3-5 minutes)

---

### Phase 7: Contact Form, Legal Pages, and Polish

**Rationale:** With SEO and i18n complete, finalize lead generation mechanics and legal compliance. These are the finishing touches before launch.

**Delivers:**
- Contact form wired to backend API
- Form validation with Zod + TanStack Form
- Honeypot spam protection
- Trust signals near submit button
- Privacy Policy and Terms pages with GDPR compliance
- Cookie consent banner with granular opt-in/opt-out
- Minimal contact form fields (name, email, message)
- Strong CTA language ("Get a Free Consultation", not "Submit")
- Mobile optimization of contact form
- Legal page content reviewed for GDPR (data processing, cookies, rights of data subjects)

**Addresses:**
- TS-4 (Contact Form)
- TS-11 (Legal Pages)
- D-9 (Cookie Consent / GDPR Compliance)
- Validates Pitfall #10 (contact form friction)

**Avoids:**
- High-friction multi-step wizard forms (AF-7)
- Generic "Submit" CTAs with low conversion

**Validation criteria:**
- Form submits successfully to backend API
- Validation errors display correctly in all languages
- Cookie consent preferences persist in localStorage
- Privacy policy covers all GDPR requirements

---

### Phase Ordering Rationale

- **Phases 1-2 are sequential and mandatory**: SEO infrastructure must exist before i18n routing. Pre-rendering proof-of-concept de-risks the entire project.

- **Phase 3 (RTL) is a prerequisite for Phase 5 (Arabic translation)**: Cannot build Arabic pages without RTL support. Light mode fix must come first to avoid compounding visual bugs.

- **Phases 4-5 can partially overlap**: Service page enhancement (Phase 4) can begin while RTL migration (Phase 3) completes, as long as service pages are tested in RTL before Arabic translation.

- **Phase 6 (Full Pre-rendering) depends on Phases 4-5**: Cannot pre-render final content until translation is complete.

- **Phase 7 (Polish) is independent**: Contact form and legal pages can be developed in parallel with earlier phases, but must be translated as part of Phase 5.

### Research Flags

**Phases likely needing deeper research during planning:**

- **Phase 1 (Pre-rendering)**: vite-plugin-prerender maintenance status is a concern (last published 2 years ago). May need to build custom Puppeteer script. Research Prerender.io SaaS as fallback. Test in Azure DevOps / GitHub Actions CI/CD environment.

- **Phase 2 (i18n Routing)**: TanStack Router's rewrite API for i18n in pure SPA mode (not TanStack Start) has limited community examples. The optional param syntax is documented but the full i18n recipe needs validation.

- **Phase 3 (RTL Migration)**: Third-party component registries (Aceternity, cult-ui, kibo-ui, etc.) may not be RTL-compatible. Need to audit each registry's components used in the project. tw-animate-css portal bug requires manual workarounds.

**Phases with standard patterns (skip research-phase):**

- **Phase 4 (Service Pages)**: Well-documented SEO patterns. Structured data examples are plentiful. react-schemaorg + schema-dts provide type-safe approach.

- **Phase 5 (Translation)**: i18next is the industry standard with extensive documentation. String extraction and namespace organization are mechanical tasks.

- **Phase 7 (Contact Form & Legal)**: Standard form validation and GDPR compliance. No novel patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | i18next + react-i18next verified via Context7 official docs. React 19 native metadata verified via react.dev. TanStack Router optional params verified via Context7. Tailwind CSS v4 RTL support verified via official changelog. |
| Features | HIGH | Feature requirements validated against multiple B2B website analysis sources (Tilipman, Studio5 Creative, Instapage). Social proof statistics (400% logo conversion lift, 90% buyer influence) verified across multiple research sources. |
| Architecture | HIGH | TanStack Router i18n patterns verified via Context7 official docs. React 19 document metadata verified via react.dev. shadcn RTL migration verified via official docs and January 2026 changelog. Pre-rendering patterns verified via multiple sources. |
| Pitfalls | HIGH | Critical pitfalls verified via direct source inspection (react-snap GitHub repo abandonment, shadcn RTL docs, Google Search Central hreflang guidelines). Hydration mismatch pattern is well-documented React behavior. |

**Overall confidence:** HIGH

### Gaps to Address

The following areas need validation during implementation:

- **vite-plugin-prerender longevity**: The library is functional but lightly maintained. May need to build custom Puppeteer script or evaluate Prerender.io SaaS if reliability issues emerge. Budget for 1-2 days of pre-rendering experimentation in Phase 1.

- **TanStack Router SPA-mode rewrite for i18n**: The rewrite API and optional path parameters are documented, but most community examples target TanStack Start (SSR), not pure SPA. The approach recommended here is theoretically sound but needs empirical validation in Phase 2.

- **React 19 metadata hoisting with pre-rendering**: React 19's `<title>` and `<meta>` hoisting is designed for streaming SSR. In a client-rendered SPA captured by headless browser, timing may be unpredictable. Test meta tag presence in pre-rendered HTML for every route. Have @dr.pogodin/react-helmet (React 19-compatible fork) as fallback if native hoisting proves unreliable.

- **Azure Static Web Apps routing with pre-rendered files**: The existing `staticwebapp.config.json` has a catch-all `/*` route that may intercept pre-rendered file serving. This needs empirical testing with deployed pre-rendered HTML. Azure's documentation confirms static files take precedence, but the current config may override this behavior.

- **Third-party component registry RTL compatibility**: The project uses 7 component registries (Aceternity, cult-ui, kibo-ui, reui-ui, shadcn-for, reactbits, shadcnblocks). These are independent projects that may not have updated for RTL. Each registry's components used in the project must be audited during Phase 3.

- **Bosnian translated URL slugs SEO benefit**: The recommendation to use translated slugs for Bosnian (`/bs/usluge/cloud-arhitektura`) is based on SEO best practices, but actual ranking benefit needs validation with Google Search Console data post-launch.

## Sources

### Primary (HIGH confidence)

- **Context7: /i18next/react-i18next** — i18next initialization, useTranslation hook, namespaces, lazy loading, TypeScript support, Suspense integration, React 19 compatibility
- **Context7: /websites/i18next** — i18next benchmark score 95.9, core i18n framework, pluralization rules including Arabic 6-form plurals
- **Context7: /birdofpreyru/react-helmet** — @dr.pogodin/react-helmet React 19 support, SEO tag prioritization, OG/Twitter Card meta tags, JSON-LD structured data
- **Context7: /tanstack/router** — TanStack Router optional path params (`{-$locale}` syntax), file-based routing, rewrite API, beforeLoad hook, i18n guide
- [TanStack Router Document Head Management](https://tanstack.com/router/v1/docs/framework/react/guide/document-head-management) — Unhead recommendation, metadata management
- [TanStack Router Internationalization Guide](https://tanstack.com/router/v1/docs/framework/react/guide/internationalization-i18n) — URL rewrite strategy, locale handling
- [React 19 Document Metadata](https://react.dev/blog/2024/12/05/react-19) — Native `<title>` and `<meta>` component hoisting, React 19 features
- [React 19 `<title>` component](https://react.dev/reference/react-dom/components/title) — Title tag usage and behavior
- [React 19 `<meta>` component](https://react.dev/reference/react-dom/components/meta) — Meta tag hoisting, attribute requirements
- [Tailwind CSS v4.0 Release](https://tailwindcss.com/blog/tailwindcss-v4) — Logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`), CSS-first configuration
- [Tailwind CSS RTL Support](https://tailwindcss.com/docs/hover-focus-and-other-states#rtl-support) — `rtl:` and `ltr:` variant modifiers
- [shadcn/ui RTL Support](https://ui.shadcn.com/docs/rtl) — RTL configuration, `shadcn migrate rtl` CLI command, tw-animate-css known issue
- [shadcn/ui RTL Changelog](https://ui.shadcn.com/docs/changelog/2026-01-rtl) — January 2026 RTL support release announcement

### Secondary (MEDIUM confidence)

- [react-schemaorg (Google)](https://github.com/google/react-schemaorg) — Type-checked Schema.org JSON-LD rendering for React
- [schema-dts (Google)](https://github.com/google/schema-dts) — TypeScript types for Schema.org vocabulary, 100k+ weekly npm downloads
- [vite-plugin-sitemap](https://github.com/jbaubree/vite-plugin-sitemap) — Build-time sitemap generation with i18n support
- [vite-plugin-prerender](https://github.com/Rudeus3Greyrat/vite-plugin-prerender) — Vite-native pre-rendering plugin using Puppeteer
- [Unhead React Installation](https://unhead.unjs.io/docs/react/head/guides/get-started/installation) — Document head management library
- [Unhead Migration from React Helmet](https://unhead.unjs.io/docs/react/head/guides/get-started/migrate-from-react-helmet) — React Helmet alternatives
- [Best B2B Websites 2026 (Tilipman Digital)](https://www.tilipmandigital.com/resource-center/articles/best-b2b-websites) — Clear value prop, trust signals, conversion elements
- [Social Proof on Consulting Websites (Knapsack Creative)](https://knapsackcreative.com/blog-industry/consulting-website-social-proof) — Placement patterns, quality over quantity
- [B2B Landing Page Best Practices (Instapage)](https://instapage.com/blog/b2b-landing-page-best-practices) — Conversion optimization
- [B2B Website Strategy 2026 (Studio5 Creative)](https://studio5creative.com/b2b-website-strategy-for-2026/) — UX, CRO, SEO strategy
- [Social Proof Statistics 2026 (WiserReview)](https://wiserreview.com/blog/social-proof-statistics/) — 90% buyer influence, 400% logo conversion lift, 45% traffic increase with testimonials
- [Lead Generation Forms Best Practices (Monday.com)](https://monday.com/blog/crm-and-sales/lead-generation-forms/) — Field count optimization, reducing 4 fields to 3 increases conversion ~50%
- [SEO Best Practices 2026 (First Page Sage)](https://firstpagesage.com/seo-blog/seo-best-practices/) — Technical SEO fundamentals, pillar pages
- [SEO Optimization for React + Vite Apps (DEV Community)](https://dev.to/ali_dz/optimizing-seo-in-a-react-vite-project-the-ultimate-guide-3mbh) — React SPA SEO strategies
- [Azure Static Web Apps Pre-rendering](https://github.com/Azure/static-web-apps/issues/196) — Community discussion on pre-rendering approaches
- [Azure Static Web Apps Configuration](https://learn.microsoft.com/en-us/azure/static-web-apps/configuration) — Route rules, fallback behavior, staticwebapp.config.json
- [Google Search Central: Crawl Budget](https://developers.google.com/search/docs/crawling-indexing/large-site-managing-crawl-budget) — JavaScript rendering budget, redirect chains
- [hreflang Implementation Guide (LinkGraph)](https://www.linkgraph.com/blog/hreflang-implementation-guide/) — 65% error rate statistic, common mistakes, bidirectional requirements

### Tertiary (LOW confidence, needs validation)

- **TanStack Router SPA-mode rewrite for i18n**: Most examples target TanStack Start (SSR), not pure SPA. The approach is theoretically sound but needs empirical validation.
- **vite-plugin-prerender longevity**: Last published 2 years ago. Functional but maintenance status uncertain.
- **React 19 metadata hoisting with pre-rendering tools**: Timing behavior with headless browsers needs empirical testing.
- **Bosnian translated URL slugs SEO benefit**: Requires Google Search Console validation post-launch.
- **Three.js rendering in headless browser**: Assumed to be problematic based on WebGL limitations, but specific behavior with Puppeteer needs testing.

---
*Research completed: 2026-02-07*
*Ready for roadmap: yes*
