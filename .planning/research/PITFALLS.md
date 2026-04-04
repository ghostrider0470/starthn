# Domain Pitfalls

**Domain:** Corporate tech website with i18n, SEO pre-rendering, RTL support (React 19 SPA)
**Researched:** 2026-02-07
**Overall confidence:** HIGH (verified via Context7, official docs, and multiple corroborating sources)

---

## Critical Pitfalls

Mistakes that cause rewrites, major SEO damage, or fundamental architecture failures.

---

### Pitfall 1: Pre-rendering Tool Selection -- react-snap Is Abandoned

**What goes wrong:** Teams choose react-snap because it appears in every "React SPA SEO" tutorial. The original repository (stereobooster/react-snap) is unmaintained and incompatible with React 19, Vite 6, and modern Puppeteer versions. Builds break silently or produce empty HTML shells. Multiple community forks exist (chip/react-snap, natahouse/react-snap, 500px/react-snap) but none have consistent maintenance or React 19 support.

**Why it happens:** react-snap dominated the "SPA pre-rendering without SSR" space for years and is still referenced in most guides. The library has no official deprecation notice -- it just stopped receiving updates.

**Consequences:** Build pipeline breaks during deployment. If the team pushes through with workarounds, pre-rendered HTML may be incomplete (missing dynamic content, showing loading spinners to Googlebot). SEO launch delayed by weeks while evaluating alternatives mid-project.

**Warning signs:**
- Puppeteer sandbox errors during CI/CD builds
- Pre-rendered HTML contains `<div id="app"></div>` with no content
- React hydration mismatches on first load
- Build works locally but fails in Azure Static Web Apps build pipeline (no headless Chrome available)

**Prevention:**
- Evaluate `vite-plugin-prerender` (Rudeus3Greyrat/vite-plugin-prerender) which is Vite-native and actively maintained
- Consider a dynamic rendering service (Prerender.io at $49/mo for 25K renders, or self-hosted Puppeteer/Playwright solution)
- Build a proof-of-concept pre-render pipeline in Phase 1 BEFORE building pages that depend on it
- Test pre-rendering in the actual Azure Static Web Apps build environment, not just locally

**Phase:** Must be resolved in the earliest infrastructure phase. Every SEO decision downstream depends on this working.

**Confidence:** HIGH -- verified react-snap repo activity, multiple forks confirm abandonment pattern.

---

### Pitfall 2: Language-Prefixed Routing Breaks TanStack Router File-Based Routing

**What goes wrong:** Adding `/en/`, `/bs/`, `/ar/` prefixes to every route seems straightforward, but TanStack Router's file-based routing generates routes from filesystem paths. You cannot simply nest all route files under `routes/en/` and `routes/bs/` -- that creates duplicate route definitions, not language variants of the same page. Teams end up with either broken code-splitting, duplicated component code, or routes that don't resolve.

**Why it happens:** TanStack Router's i18n story is newer than the router itself. The `rewrite` API and optional path parameters (`{-$locale}`) are the correct approaches but are not prominently documented and differ significantly from how Next.js or React Router handle i18n routing.

**Consequences:** Route tree generation fails or produces unexpected results. Links between pages break when language changes. Pre-rendered pages don't match actual routes. Back button behavior becomes unpredictable across language switches.

**Warning signs:**
- `routeTree.gen.ts` grows unexpectedly large or contains duplicate entries
- `Link` components require manual locale injection for every navigation
- Browser URL and TanStack Router's internal state disagree about current path
- Language switching causes full page reloads instead of client-side navigation

**Prevention:**
- Use TanStack Router's `rewrite` API (verified in Context7 docs) for locale prefix stripping/restoration:
  ```ts
  const router = createRouter({
    routeTree,
    rewrite: {
      input: ({ url }) => { /* strip /en, /bs, /ar prefix */ },
      output: ({ url }) => { /* add current locale prefix back */ },
    },
  })
  ```
- Keep route files at their normal paths (`routes/about.tsx`, not `routes/en/about.tsx`)
- The router internally works with un-prefixed paths; the rewrite layer handles display URLs
- Alternative: use optional path parameter syntax `{-$locale}` in route filenames
- Build and test the routing layer with all three locales BEFORE building page content

**Phase:** Infrastructure/routing phase. This is foundational -- get it wrong and every page and link is affected.

**Confidence:** HIGH -- verified directly against TanStack Router Context7 docs, including rewrite API examples and i18n guide.

---

### Pitfall 3: Googlebot Redirect Traps from Accept-Language Detection

**What goes wrong:** The site detects browser language via `Accept-Language` header or `navigator.language` and automatically redirects users to the matching language prefix (e.g., `/` redirects to `/bs/` for Bosnian browsers). Googlebot sends `Accept-Language: en` -- if the default language is Bosnian and you redirect English speakers, Googlebot only ever sees the English version. If the default is English and Bosnian users get redirected, Google may never properly index the Bosnian pages because it follows the redirect chain differently than intended.

**Why it happens:** Auto-redirect feels like good UX -- "detect their language and send them there." But search engine crawlers are not users. They do not follow the same redirect logic, and redirect chains burn crawl budget.

**Consequences:** Google indexes only one language variant. The hreflang annotations become meaningless because Google never sees the pages they point to. Months of translation work invisible to search. Organic traffic from non-English markets never materializes.

**Warning signs:**
- Google Search Console shows only English pages indexed despite Bosnian content existing
- "Alternate page with proper canonical tag" errors in Search Console
- Crawl stats show Googlebot hitting redirect chains
- Bosnian/Arabic pages appear as "Discovered -- currently not indexed"

**Prevention:**
- NEVER auto-redirect based on language detection. Instead, show a non-intrusive language suggestion banner
- Default language (English) should be served at `/` with NO redirect
- Other languages at `/bs/` and `/ar/` -- accessible via explicit navigation only
- Use `<link rel="alternate" hreflang="x">` tags to tell Google about language variants
- Every page must include a self-referential hreflang tag PLUS tags for all other language versions
- Verify with Google's Rich Results Test and URL Inspection tool after launch

**Phase:** Routing/SEO infrastructure phase. Must be a hard rule established before any language detection code is written.

**Confidence:** HIGH -- this is well-documented by Google's own SEO guidelines and Yoast's hreflang guide.

---

### Pitfall 4: Pre-rendered HTML and Client Hydration Mismatch with i18n

**What goes wrong:** The pre-renderer runs in headless Chrome with a default language (e.g., English). It captures HTML. The client-side React app boots, detects the user's language preference, and tries to render in a different language. React detects a DOM mismatch between the pre-rendered HTML (English) and the hydrated state (user's language). This causes either a full re-render (negating pre-rendering benefits, causing flash of wrong content) or visible UI corruption.

**Why it happens:** Pre-rendering and i18n are independently well-understood, but their interaction is subtle. The pre-renderer must know which language variant it is capturing, and that HTML must be served to the correct audience.

**Consequences:** Flash of English content on Bosnian pages before client hydration kicks in. Google sees English content on `/bs/` pages. Users see layout shift as text length changes between languages. Core Web Vitals (CLS, LCP) suffer.

**Warning signs:**
- Console warnings about hydration mismatches
- Visible flash of wrong-language content on page load
- Google indexes English text for `/bs/` URLs
- Layout shifts measured in Core Web Vitals reports

**Prevention:**
- Pre-render EACH language variant separately: generate `/en/index.html`, `/bs/index.html`, `/ar/index.html` etc.
- Set the `lang` attribute on `<html>` during pre-rendering to match the target language
- The pre-render configuration must crawl all language-prefixed routes, not just the root
- For dynamic rendering services (Prerender.io), configure language-aware caching
- Ensure i18next initializes with the SAME language the pre-rendered HTML was generated for (read from URL prefix, not browser detection)

**Phase:** Pre-rendering infrastructure phase. Must be designed alongside the i18n routing architecture -- they are inseparable.

**Confidence:** HIGH -- this is a well-documented React hydration behavior, verified against react-i18next Context7 docs on initialization.

---

### Pitfall 5: shadcn/ui RTL Migration with Existing Components and tw-animate-css

**What goes wrong:** shadcn/ui added first-class RTL support in January 2026 via a CLI migration command (`shadcn migrate rtl`). However, this project already has 30+ installed shadcn components using physical CSS classes (`ml-4`, `left-0`, `text-left`). The migration transforms these to logical properties (`ms-4`, `start-0`, `text-start`). But: (a) the project uses `tw-animate-css` which has a known bug where logical slide utilities (`slide-in-from-start`, `slide-in-from-end`) do not work correctly, requiring manual `dir` prop passing to portal elements; (b) components from third-party registries (Aceternity, cult-ui, etc.) may not have been updated for RTL; (c) the extensive custom CRT animations in `styles.css` use physical directional properties that the migration tool will not touch.

**Why it happens:** shadcn's RTL support is new (January 2026) and the ecosystem is still catching up. Third-party registries are independent projects. The CLI migration handles shadcn components but not custom CSS.

**Consequences:** After running the RTL migration: popovers, tooltips, and dropdown menus render in wrong positions in RTL mode. Third-party components (Aceternity effects, cult-ui elements) break visually in RTL. Custom CRT animations (slide-in-left, scanline-wipe with clip-path) display incorrectly for Arabic users.

**Warning signs:**
- After `shadcn migrate rtl`: dropdowns/popovers appear on wrong side
- Radix portal elements (Dialog, Popover, Tooltip) ignore document direction
- CRT scanline animations appear reversed or misaligned in RTL
- Third-party registry components look broken only in RTL mode

**Prevention:**
- Set `"rtl": true` in `components.json` BEFORE adding any new components
- Run `shadcn migrate rtl` on existing components, then manually audit each portal-based component (Dialog, Popover, Tooltip, DropdownMenu, Select) -- pass `dir` prop explicitly to their Content elements
- Audit all 7 third-party registries for RTL compatibility BEFORE using their components on RTL pages. Prefer shadcn core components for RTL-critical UI
- The custom CRT animations in `styles.css` (slide-in-left, scanline-wipe, data-stream) use `translateX` which is physical -- these need RTL-aware variants or should be scoped to dark mode only (CRT effects are dark-mode-specific per PROJECT.md, and Arabic users may also use dark mode)
- Create a dedicated RTL test page early that renders every UI component for visual verification

**Phase:** UI infrastructure phase, immediately after i18n routing is working. Must happen before building Arabic-facing pages.

**Confidence:** HIGH -- verified shadcn RTL docs, tw-animate-css known issue confirmed, existing components.json examined (no `rtl` key present).

---

## Moderate Pitfalls

Mistakes that cause delays, rework, or accumulated technical debt.

---

### Pitfall 6: Translation Key Architecture -- Flat Keys vs. Nested Namespaces

**What goes wrong:** Teams start with a single `translation.json` file with flat keys like `"hero_title"`, `"hero_subtitle"`, `"services_web_title"`. This works for 50 keys. At 500+ keys across 5 service pages, a landing page, contact form, navbar, and footer, the file becomes unmaintainable. Worse: loading ALL translations upfront (every service page, admin text, error messages) increases initial bundle size even though the user only needs the current page's translations.

**Why it happens:** i18next tutorials show simple flat-key examples. Namespace splitting and lazy loading are "advanced" topics covered later. By the time the team realizes they need them, hundreds of keys are already in the flat structure and must be reorganized.

**Prevention:**
- Design the namespace structure BEFORE writing any translation keys:
  - `common.json` -- shared UI (navbar, footer, buttons, language switcher)
  - `landing.json` -- hero, social proof, CTA sections
  - `services.json` -- services overview page
  - `service-web.json`, `service-cloud.json`, etc. -- individual service pages
  - `contact.json` -- contact form, validation messages
  - `seo.json` -- meta titles, descriptions, structured data text
- Use `i18next-http-backend` with `loadPath: '/locales/{{lng}}/{{ns}}.json'` so namespaces are loaded on demand
- Each route should declare which namespaces it needs; unused namespaces are never fetched
- Use nested keys within namespaces: `{ "hero": { "title": "...", "subtitle": "..." } }` with the `keyPrefix` option in `useTranslation`

**Phase:** i18n setup phase. Namespace structure must be defined before any translation keys are created.

**Confidence:** HIGH -- verified against i18next official docs on namespaces and lazy loading.

---

### Pitfall 7: hreflang Implementation Errors -- The 65% Failure Rate

**What goes wrong:** Research shows over 65% of international websites have significant hreflang implementation errors. The most common: missing self-referential tags, incorrect ISO codes, canonical tag conflicts, missing return links, and using relative URLs.

**Why it happens:** hreflang has strict bidirectional requirements that are unintuitive. Every language version of a page must reference ALL other versions AND itself. A single missing or incorrect tag can cause Google to ignore all hreflang annotations for that page.

**Consequences:** Google shows the wrong language version in search results for a given country. English results appear for Bosnian queries. Duplicate content penalties across language variants.

**Warning signs:**
- Google Search Console reports "hreflang tag errors"
- "Alternate page with proper canonical tag" warnings
- Google shows English snippet for `/bs/` pages in Bosnian search results
- Organic traffic from target markets (Bosnia, DACH, Middle East) remains zero

**Prevention:**
- Generate hreflang tags programmatically, never manually -- create a utility function that outputs the full set for any given page
- Every page must include:
  ```html
  <link rel="alternate" hreflang="en" href="https://horizonTech.ba/en/services" />
  <link rel="alternate" hreflang="bs" href="https://horizonTech.ba/bs/services" />
  <link rel="alternate" hreflang="ar" href="https://horizonTech.ba/ar/services" />
  <link rel="alternate" hreflang="x-default" href="https://horizonTech.ba/en/services" />
  ```
- Always use absolute URLs (full `https://...` paths)
- Use lowercase language codes, uppercase country codes with hyphen separator: `en`, `bs`, `ar` (or `en-US`, `bs-BA`)
- Each language version's canonical tag must point to ITSELF, not to a "master" version
- Include hreflang tags in the XML sitemap as an alternative/supplement to HTML tags
- Validate with Google's Rich Results Test and third-party hreflang validators before launch

**Phase:** SEO implementation phase. Build the hreflang generator as a utility, test it in isolation, then integrate into pre-rendered pages.

**Confidence:** HIGH -- hreflang requirements are well-documented by Google Search Central and Yoast.

---

### Pitfall 8: Structured Data Not Present in Pre-rendered HTML

**What goes wrong:** JSON-LD structured data is injected via React components at runtime. The pre-renderer may or may not capture it depending on timing. If structured data is generated after the pre-render snapshot is taken (e.g., it depends on an API call or lazy-loaded component), the pre-rendered HTML has no structured data. Google uses the pre-rendered HTML, sees no structured data, and the site gets no rich results.

**Why it happens:** In a normal React SPA, JSON-LD is just a `<script type="application/ld+json">` tag rendered by a component. Pre-rendering tools capture DOM state at a specific moment. If the structured data component has any async dependency or is inside a Suspense boundary, it may not be captured.

**Consequences:** No rich results in Google (no Organization card, no Service listings, no FAQ accordions showing in search). Competitors with proper structured data get more prominent search placement.

**Warning signs:**
- Google Rich Results Test shows no structured data detected
- "View page source" of pre-rendered HTML has no `<script type="application/ld+json">` tags
- Structured data works in dev but not in pre-rendered builds

**Prevention:**
- Inject JSON-LD structured data as STATIC strings in the HTML template or at the highest possible level in the component tree -- not inside lazy-loaded or Suspense-wrapped components
- For the corporate site, most structured data is static (Organization, LocalBusiness, Service schemas) -- hardcode it or generate it at build time
- Use React 19's Document Metadata (`<title>`, `<meta>`, `<link>` rendered from components hoist to `<head>`) for meta tags, but inject JSON-LD separately in a non-Suspense component
- Validate pre-rendered HTML files directly (not the live site) with Google's Rich Results Test using the "code" input mode
- Key schemas for this site: `Organization`, `LocalBusiness`, `Service` (one per service page), `WebSite` (with `SearchAction`), `BreadcrumbList`

**Phase:** SEO implementation phase, but the injection strategy must be decided during the pre-rendering infrastructure phase.

**Confidence:** HIGH -- verified structured data requirements via Google developer docs and React SPA SEO guides.

---

### Pitfall 9: Azure Static Web Apps Fallback Routing Conflicts with Pre-rendered Pages

**What goes wrong:** The current `staticwebapp.config.json` rewrites ALL routes to `/index.html` (the SPA fallback). When pre-rendered HTML files exist at `/en/services/index.html`, the fallback rule may take precedence, serving the root `index.html` instead of the pre-rendered file. The result: pre-rendered pages exist but are never served to crawlers.

**Why it happens:** Azure Static Web Apps processes routes in a specific order. The current configuration has a catch-all `"route": "/*"` with `"serve": "/index.html"` and a 404 override that also serves `index.html`. These rules can mask the existence of pre-rendered static files.

**Consequences:** Pre-rendering pipeline works perfectly. HTML files are generated. Google still sees empty SPA shell because the server sends `index.html` for every request. All SEO work is invisible.

**Warning signs:**
- Crawling pre-rendered URLs returns SPA shell HTML, not pre-rendered content
- `curl https://site.com/en/services` returns generic `index.html` content
- Google Search Console shows pages as "soft 404" despite content existing
- Pre-rendered files visible in deployment artifact but not served

**Prevention:**
- Restructure `staticwebapp.config.json` to serve static files FIRST, with SPA fallback only for routes that don't have a matching static file
- Pre-rendered files should be placed at exact URL paths: `/en/services/index.html` for `/en/services`
- Remove the `"route": "/*"` catch-all or ensure it has lower priority than static file serving
- Azure Static Web Apps automatically serves `index.html` from directories -- pre-rendered files at `/en/services/index.html` will be served for `/en/services` IF the catch-all doesn't intercept first
- Test with `curl -I` against deployed URLs to verify the correct file is served
- Add specific route rules for language prefixes if needed:
  ```json
  { "route": "/en/*", "serve": "/en/{path}/index.html" }
  ```

**Phase:** Deployment/infrastructure phase. Must be validated as part of the pre-rendering proof of concept.

**Confidence:** MEDIUM -- Azure Static Web Apps routing behavior with pre-rendered files needs empirical testing. The documentation confirms static files take precedence, but the current catch-all config may override this.

---

### Pitfall 10: Contact Form Lead Conversion Friction

**What goes wrong:** Tech company websites ask for too much information upfront: company name, job title, project budget, timeline, detailed project description -- all required fields. Visitors who came from organic search with casual interest bounce immediately. Forms using generic CTAs ("Submit", "Send Message") convert at 2-3%. The form is buried below the fold or on a separate `/contact` page that requires navigation.

**Why it happens:** The team builds forms from an internal perspective ("what do we need to qualify this lead?") instead of the visitor's perspective ("what's the minimum barrier to starting a conversation?").

**Consequences:** The site ranks well, gets traffic, but generates no leads. The entire SEO investment produces page views but no business value.

**Warning signs:**
- High traffic to service pages, near-zero contact form submissions
- Google Analytics shows users reaching the contact page but not completing the form
- Form completion rate below 5%
- High bounce rate on contact page

**Prevention:**
- Minimal required fields: Name, Email, and one open-ended "How can we help?" textarea. Everything else optional
- Strong CTA language specific to the action: "Get a Free Consultation", "Discuss Your Project", "Start a Conversation" -- not "Submit"
- Embed a compact contact CTA on EVERY service page (not just the contact page) -- users should never need to navigate away to express interest
- Progressive disclosure: collect basic info first, ask qualifying questions in follow-up emails
- Mobile optimization: form must be thumb-friendly, no tiny checkboxes, no dropdowns with 20 options
- Add social proof near the form: "Join 50+ companies we have helped" or similar
- Translate CTAs properly -- "Get a Free Consultation" in Bosnian is not the same as a literal translation of "Submit"

**Phase:** Landing page / contact page design phase. The form design should be finalized before development, with conversion principles baked in from the start.

**Confidence:** HIGH -- B2B lead generation conversion data is well-documented across multiple marketing research sources.

---

## Minor Pitfalls

Mistakes that cause annoyance, polish issues, or minor rework.

---

### Pitfall 11: Text Expansion Breaking Layouts Across Languages

**What goes wrong:** UI designed pixel-perfect for English text. Bosnian translations are 20-30% longer. Arabic text has different height characteristics. Navigation items overflow. Buttons clip text. Hero section titles wrap unexpectedly. Card layouts become uneven.

**Prevention:**
- Design with "pseudo-localization" first -- use English strings padded 30% longer to test layout flexibility
- Never use fixed widths on text containers
- Test ALL breakpoints (mobile, tablet, desktop) with the longest language variant
- Navigation items: use abbreviations or restructure for languages with longer words
- Use `text-wrap: balance` on headings to prevent orphans in any language
- Arabic has taller line height needs -- set language-specific `line-height` adjustments

**Phase:** UI development phase. Every component should be tested with long strings before being considered done.

---

### Pitfall 12: RTL-Unaware Icons and Directional Imagery

**What goes wrong:** Arrow icons, chevrons, progress indicators, and illustrations that imply direction (left-to-right flow diagrams, timelines) look wrong in RTL layouts. A "next" arrow pointing right in LTR should point left in RTL. Breadcrumb separators (`/` or `>`) need mirroring. The globe visualization itself is direction-neutral (good), but surrounding UI elements may not be.

**Prevention:**
- shadcn's RTL migration automatically adds `rtl:rotate-180` to supported icons, but verify this covers all Lucide icons used in navigation
- Custom icons and illustrations need manual RTL variants
- Breadcrumb separators: use logical direction-aware characters or CSS transforms
- Progress bars and step indicators: verify they flow right-to-left in RTL
- The Three.js globe component renders in a Canvas -- it is direction-agnostic and should NOT be mirrored. Ensure its container does not inherit `dir="rtl"` styling that could affect layout positioning

**Phase:** RTL implementation phase. Create a checklist of all directional UI elements before starting RTL work.

---

### Pitfall 13: Document `lang` and `dir` Attributes Not Synced with Route

**What goes wrong:** The `<html>` element's `lang` and `dir` attributes are set once at page load and never updated. When a user switches from English to Arabic, the `lang` remains `"en"` and `dir` remains `"ltr"`. Screen readers announce the wrong language. Browser spell-check uses the wrong dictionary. RTL CSS never activates.

**Prevention:**
- Create a React effect that syncs `document.documentElement.lang` and `document.documentElement.dir` with the current i18next language on every language change
- In the router's `rewrite.input`, detect the locale and set these attributes as a side effect
- Pre-rendered HTML for each language must have the correct `lang` and `dir` baked in
- Test with screen readers (VoiceOver, NVDA) to confirm language detection works

**Phase:** i18n infrastructure phase. This is a one-time setup but must happen early.

---

### Pitfall 14: CRT Effects in Light Mode and RTL Interaction

**What goes wrong:** Per PROJECT.md, CRT effects (scanlines, glow, phosphor pulse) are dark-mode-specific. But the existing CSS in `styles.css` does not scope all CRT animations to `.dark` -- some animations like `slide-in-left` and `scanline-wipe` use physical directional properties (`translateX(-100%)`, `clip-path: inset(0 0 100% 0)`) that could interact unexpectedly with RTL layouts. Additionally, the light mode is already broken (gray everywhere), and adding RTL on top of a broken light mode creates compounding visual bugs.

**Prevention:**
- Fix light mode BEFORE adding RTL support -- otherwise you are debugging two visual systems simultaneously
- Scope ALL CRT-specific effects to `.dark` in CSS to prevent them from interfering with light mode or RTL layouts
- For `translateX`-based animations, consider whether RTL users see them as flowing in the wrong direction -- scanlines moving vertically are fine, horizontal wipes may need RTL variants
- Keep the CRT overlay (`pointer-events: none`) and ensure it does not shift position in RTL

**Phase:** Light mode fix phase FIRST, then RTL phase. Do not attempt both simultaneously.

---

### Pitfall 15: SEO Meta Tags Using React 19 Document Metadata Without Pre-render Awareness

**What goes wrong:** React 19 introduced native document metadata support -- `<title>`, `<meta>`, and `<link>` tags rendered in components automatically hoist to `<head>`. Teams adopt this eagerly, removing react-helmet-async. But the pre-rendering tool may not capture these hoisted tags if it snapshots the DOM before React's metadata hoisting completes. The pre-rendered HTML ends up with the default `<title>Horizon Tech</title>` from `index.html` for every page.

**Why it happens:** React 19's metadata hoisting is designed for streaming SSR where the server controls the full HTML output. In a client-rendered SPA captured by a headless browser, the timing is less predictable.

**Prevention:**
- Test meta tag presence in pre-rendered HTML output for EVERY route
- If React 19 metadata hoisting does not work reliably with the chosen pre-render tool, fall back to `@dr.pogodin/react-helmet` (the maintained successor to react-helmet-async, compatible with React 19)
- For critical SEO pages, verify with `curl` or direct HTML inspection that `<title>` and `<meta name="description">` are unique per page in the pre-rendered output
- The `index.html` template should have generic fallback meta tags, but every route component should override them

**Phase:** Pre-rendering/SEO phase. Test during the pre-rendering proof of concept.

**Confidence:** MEDIUM -- React 19 document metadata behavior with pre-rendering tools needs empirical verification.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Pre-render infrastructure | react-snap incompatible with React 19/Vite 6 (#1) | Evaluate vite-plugin-prerender or Prerender.io first; build POC |
| i18n routing setup | TanStack Router locale prefix breaks file-based routing (#2) | Use `rewrite` API, not filesystem nesting |
| i18n routing setup | Accept-Language redirect traps (#3) | Hard rule: no auto-redirects, banner suggestion only |
| i18n + pre-render integration | Hydration mismatch between pre-rendered and client language (#4) | Pre-render each language variant separately |
| RTL UI migration | shadcn RTL migration + tw-animate-css bug + 3rd party registries (#5) | Enable `rtl: true` in components.json, audit portals, test 3rd party components |
| Translation architecture | Flat keys become unmaintainable at scale (#6) | Define namespace structure before writing keys |
| SEO markup | hreflang bidirectional requirements (#7) | Generate programmatically, validate with tools |
| SEO structured data | JSON-LD missing from pre-rendered HTML (#8) | Inject statically, validate pre-rendered output |
| Azure deployment | SPA fallback overrides pre-rendered files (#9) | Restructure staticwebapp.config.json, test with curl |
| Contact/lead gen | High-friction forms kill conversion (#10) | Minimal fields, strong CTAs, forms on every service page |
| UI polish | Text expansion breaks layouts in non-English (#11) | Design with 30% padding, test all languages at all breakpoints |
| RTL visuals | Directional icons and imagery not mirrored (#12) | Audit all directional elements, use shadcn RTL icon flipping |
| i18n infrastructure | `lang`/`dir` attributes out of sync (#13) | Sync via React effect on language change |
| Light mode + RTL | CRT animations conflict with RTL, light mode already broken (#14) | Fix light mode FIRST, scope CRT to `.dark` |
| Meta tags | React 19 metadata hoisting unreliable in pre-render (#15) | Test empirically, have helmet fallback ready |

---

## Sources

### Context7 (HIGH confidence)
- react-i18next documentation: initialization, useTranslation hook, SSR configuration, Suspense support
- TanStack Router documentation: rewrite API, optional path parameters, i18n routing guide, URL rewrites

### Official Documentation (HIGH confidence)
- [shadcn/ui RTL Support](https://ui.shadcn.com/docs/rtl) -- RTL configuration, CLI migration, tw-animate-css known issue
- [shadcn/ui RTL Changelog](https://ui.shadcn.com/docs/changelog/2026-01-rtl) -- January 2026 RTL support release
- [Google Search Central: Crawl Budget](https://developers.google.com/search/docs/crawling-indexing/large-site-managing-crawl-budget) -- JavaScript rendering budget
- [Azure Static Web Apps Configuration](https://learn.microsoft.com/en-us/azure/static-web-apps/configuration) -- Route rules, fallback behavior

### WebSearch-verified (MEDIUM confidence)
- [Prerender.io SPA SEO Challenges](https://prerender.io/blog/spa-javascript-seo-challenges-and-solutions/) -- 7 common SPA SEO challenges
- [hreflang Implementation Guide](https://www.linkgraph.com/blog/hreflang-implementation-guide/) -- 65% error rate statistic, common mistakes
- [Tailwind CSS RTL Guide (Flowbite)](https://flowbite.com/docs/customize/rtl/) -- logical properties approach
- [Common i18n Mistakes in React](https://infinitejs.com/posts/common-mistakes-i18n-react) -- hard-coded strings, async initialization
- [B2B Lead Generation Mistakes](https://www.scoreapp.com/b2b-lead-generation-mistakes/) -- form friction, CTA language
- [React 19 Document Metadata](https://blog.logrocket.com/guide-react-19-new-document-metadata-feature/) -- native metadata hoisting behavior
- [react-snap GitHub](https://github.com/stereobooster/react-snap) -- maintenance status, known limitations
- [Structured Data SEO in React](https://blog.logrocket.com/improving-react-seo-structured-data/) -- JSON-LD injection patterns
- [vite-plugin-prerender](https://github.com/Rudeus3Greyrat/vite-plugin-prerender) -- Vite-native alternative to react-snap

---

*Pitfalls research: 2026-02-07*
