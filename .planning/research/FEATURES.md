# Feature Landscape

**Domain:** Corporate tech company website (IT services / dev shop / consulting)
**Company:** Horizon Tech d.o.o. Sarajevo
**Researched:** 2026-02-07
**Overall confidence:** HIGH (multiple corroborating sources, verified patterns from top B2B sites, Context7 for library specifics)

---

## Table Stakes

Features visitors expect from a professional IT services company. Missing any of these and the site feels amateurish, unfinished, or untrustworthy. Visitors leave.

### TS-1: Clear Value Proposition in Hero Section

| Aspect | Detail |
|--------|--------|
| **Why Expected** | Visitors decide within 3-5 seconds whether to stay. Every major consulting firm (Accenture, Deloitte, Slalom) leads with outcome-oriented messaging, not feature lists. 2026 trend: "story-driven hero sections using visual demonstrations outperform static taglines." |
| **Complexity** | Medium |
| **What exists** | Hero with CRT boot animation, DecryptedText title, particle background. Messaging says "Building Tomorrow's Software Today" with tech list underneath. |
| **What's needed** | Tighten copy to be outcome-focused ("We build the software that powers your business"), add above-the-fold social proof (logo strip or stat), ensure primary CTA leads to contact/consultation. The CRT reveal is a strong differentiator -- keep it. |
| **Dependencies** | None (standalone) |

### TS-2: Service Pages with Dedicated URLs

| Aspect | Detail |
|--------|--------|
| **Why Expected** | Google ranks individual service pages, not "everything we do" listings. IT companies need one URL per service for SEO targeting (e.g., "AI development company Sarajevo"). Each page needs benefit-oriented copy, relevant tech stacks, process explanation, and embedded CTAs. |
| **Complexity** | Medium |
| **What exists** | Six service routes already exist (`enterprise-software-development`, `ai-ml-business-intelligence`, `cloud-architecture`, `devops-platform-engineering`, `digital-transformation`, `iot-edge-computing`). Each has capabilities list, tech stack, and CTA buttons. |
| **What's needed** | Add structured data (JSON-LD Service schema), per-page meta tags (title, description, OG), testimonial relevant to that service, case study snippet, FAQ section per service (targets featured snippets), and internal cross-links to related services. |
| **Dependencies** | TS-6 (SEO infrastructure), TS-3 (social proof content) |

### TS-3: Social Proof (Logos, Stats, Testimonials)

| Aspect | Detail |
|--------|--------|
| **Why Expected** | 90% of B2B buyers are influenced by social proof when comparing vendors (Gartner). Adding client logos to a landing page can increase conversions by 400%. Websites with testimonials receive 45% more traffic. This is non-negotiable for B2B credibility. |
| **Complexity** | Low-Medium |
| **What exists** | `GlobalCredibilitySection` with animated stat counters (CRTCounter), `PartnerBadges` component, `TestimonialsSection` component. Stats include team, projects, tech, and satisfaction metrics. |
| **What's needed** | Ensure real client logos (not placeholders), add testimonials with name/role/company/headshot in "Challenge -> Solution -> Result" format, scatter social proof throughout site (not just one section) -- near CTAs, on service pages, in footer. Keep to 3-5 powerful testimonials rather than 30 generic ones. |
| **Dependencies** | Real content from the company (logos, quotes, stats) |

### TS-4: Contact / Lead Capture Form

| Aspect | Detail |
|--------|--------|
| **Why Expected** | The entire point of a corporate tech website is lead generation. Every IT services site has a contact form. B2B conversion rates: dedicated landing pages convert 5-15%, full websites average 2-3%. Reducing form fields from 4 to 3 increases conversion by ~50%. |
| **Complexity** | Medium |
| **What exists** | Contact page at `/contact` with form (name, email, company, subject dropdown, message). Currently simulates submission with `setTimeout`. Has contact methods (email, location, response time). |
| **What's needed** | Wire form to actual backend API, add form validation (Zod + TanStack Form for consistency with rest of app), add honeypot/spam protection, add trust signals near submit button, consider shorter top-of-funnel form (name + email only) alongside the full form. Add CTAs pointing to contact across ALL pages, not just the contact page. |
| **Dependencies** | Backend API endpoint for form submission |

### TS-5: Responsive Mobile Experience

| Aspect | Detail |
|--------|--------|
| **Why Expected** | 83% of landing page visits are on mobile (Unbounce). Google uses mobile-first indexing. If the site doesn't work well on mobile, it's invisible to most visitors AND Google. |
| **Complexity** | Low (mostly exists) |
| **What exists** | Responsive layout components (`PageContainer`, `SectionContainer`), responsive grid in design system, mobile-friendly navigation. |
| **What's needed** | Audit all new pages for mobile breakpoints, test 3D globe performance on mobile (may need to hide or simplify), ensure CRT effects don't break mobile layouts, test contact form on small screens. |
| **Dependencies** | None |

### TS-6: SEO Infrastructure (Meta Tags, Structured Data, Sitemap)

| Aspect | Detail |
|--------|--------|
| **Why Expected** | "Mastering technical SEO fundamentals has become non-negotiable for search success in 2026." Without meta tags and structured data, the SPA is invisible to search engines. A React SPA has ONE index.html -- every route needs its own title, description, and OG tags dynamically. |
| **Complexity** | High |
| **What exists** | Basic `index.html` with generic meta description ("Horizon Tech - Modern React Application"), `robots.txt` allowing all crawling, no sitemap, no structured data, no per-route meta tags, no Open Graph tags. |
| **What's needed** | (1) `react-helmet-async` or `@dr.pogodin/react-helmet` for per-route `<head>` management (title, description, OG, Twitter Cards, canonical URLs, JSON-LD), (2) `vite-plugin-sitemap` for auto-generated sitemap.xml, (3) Proper robots.txt with sitemap reference, (4) JSON-LD structured data (Organization, Service, LocalBusiness, FAQPage schemas), (5) Pre-rendering solution for SPA (react-snap or prerender.io) so search engines see rendered HTML, (6) Open Graph images for social sharing. |
| **Dependencies** | Pre-rendering tooling (TS-7) |
| **Technical note** | TanStack Router has a `head` property in route definitions for document head management, but this is primarily for TanStack Start (SSR). For a Vite SPA, react-helmet-async is the established approach. Verified via Context7: `@dr.pogodin/react-helmet` is the modern successor supporting React 19. |

### TS-7: Pre-rendering for SPA SEO

| Aspect | Detail |
|--------|--------|
| **Why Expected** | React SPAs render client-side. Google can execute JS but it's slower and less reliable. Pre-rendering generates static HTML at build time for each route, giving crawlers real content immediately. PROJECT.md explicitly mandates this: "SPA with pre-rendering for SEO (react-snap, prerender.io, or similar). No SSR." |
| **Complexity** | High |
| **What exists** | Nothing -- pure client-side rendering. |
| **What's needed** | Pre-rendering solution that works with Vite + TanStack Router. Options: (1) `vite-plugin-prerender` / `prerender-spa-plugin` for build-time rendering, (2) `prerender.io` as a hosted service (middleware), (3) `react-snap` (may need fork for Vite compatibility). Must handle dynamic routes (service pages, localized URLs). Azure Static Web Apps supports custom redirects and rewrites for this. |
| **Dependencies** | TS-6 (meta tags must be in place before pre-rendering captures them) |
| **Risk** | HIGH -- pre-rendering with dynamic i18n routes and Three.js can be tricky. Three.js needs WebGL which headless browsers may not support. May need conditional rendering during pre-render pass. |

### TS-8: Navigation with Clear Information Architecture

| Aspect | Detail |
|--------|--------|
| **Why Expected** | Users need to find services, contact, and about pages within 1-2 clicks. "Plan the site architecture by structuring navigation so it guides users logically, from learning about your services to scheduling a consultation." Every IT services site has: Services (dropdown), About, Contact, possibly Blog/Resources. |
| **Complexity** | Low-Medium |
| **What exists** | `AppHeader` component with navigation. Landing page has `SideNavigation` and `GlobeNavigation`. Routes exist for about, contact, team, careers, case-studies, blog, privacy, terms, support, education. |
| **What's needed** | Structured mega-menu or dropdown for Services (6 service areas), clear primary navigation (Services, About, Contact), secondary navigation (Blog, Careers, Support), persistent CTA button in header ("Get in Touch" / "Free Consultation"), breadcrumbs on inner pages for SEO. |
| **Dependencies** | None |

### TS-9: About / Company Page

| Aspect | Detail |
|--------|--------|
| **Why Expected** | B2B buyers research the company, not just the service. The About page builds trust with company story, team photos, values, and location. "Mix credentials, logos, and media mentions with your story." |
| **Complexity** | Low |
| **What exists** | `/about` route exists. `CompanyStorySection`, `MissionSection`, `CoreValuesSection`, `TeamSection`, `TeamCultureSection` components exist in landing directory. |
| **What's needed** | Ensure company registration details (d.o.o. Sarajevo), founding story, team with real photos, values alignment, and office location/map are present. Add structured data (Organization schema). |
| **Dependencies** | Real content (team photos, company narrative) |

### TS-10: Footer with Essential Links

| Aspect | Detail |
|--------|--------|
| **Why Expected** | Every professional website has a footer with company info, service links, legal links (Privacy, Terms), social media, contact info, and possibly a newsletter signup or quick contact form. It's the universal "safety net" navigation. |
| **Complexity** | Low |
| **What exists** | Likely in root layout or landing layout (not separately confirmed but standard). |
| **What's needed** | Company name + registration, service quick links, legal links (Privacy at `/privacy`, Terms at `/terms`), contact info (email, location), social media icons, possibly language switcher, copyright notice. |
| **Dependencies** | None |

### TS-11: Legal Pages (Privacy Policy, Terms)

| Aspect | Detail |
|--------|--------|
| **Why Expected** | GDPR requires privacy policy for EU visitors. Contact form with data collection requires disclosure. Professional credibility demands these pages exist. |
| **Complexity** | Low |
| **What exists** | Routes at `/privacy` and `/terms` exist. |
| **What's needed** | Ensure content covers GDPR compliance (data processing, cookies, contact form data handling, rights of data subjects). If using analytics or tracking, disclose it. Cookie consent banner if applicable. |
| **Dependencies** | Legal review of content |

---

## Differentiators

Features that set Horizon Tech apart from other IT services companies. Not universally expected, but create competitive advantage when done well.

### D-1: CRT / Retro-Futuristic Aesthetic (Signature Visual Identity)

| Aspect | Detail |
|--------|--------|
| **Value Proposition** | No other IT consulting firm has this visual language. The CRT boot sequence, scanlines, phosphor glow, DecryptedText effect, and particle backgrounds create immediate memorability. In a sea of generic corporate sites, this is instant differentiation. "In 2026 the pull is toward clean, focused layouts" -- but that's what EVERYONE does. The CRT aesthetic breaks the pattern and signals technical depth. |
| **Complexity** | Low (already built) |
| **What exists** | `HeroCRTReveal`, `CRTCounter`, scanline overlays, phosphor glow animations, DecryptedText component, particle backgrounds, RGB split effects. |
| **What's needed** | Polish and optimize. Ensure effects don't hurt performance (LCP, CLS). Add subtle CRT effects to other pages (not just hero) -- page transitions, section reveals, loading states. Ensure dark-mode-only for CRT effects (they look wrong on light backgrounds). |
| **Dependencies** | None |

### D-2: Interactive 3D Globe

| Aspect | Detail |
|--------|--------|
| **Value Proposition** | Communicates "global presence" more powerfully than a flat map. Interactive element increases engagement time. Few dev shops invest in Three.js on their marketing site -- it signals technical capability through the medium itself. "Interactive components, embedded product previews, and guided tours right in the hero section build trust." |
| **Complexity** | Low (already built) |
| **What exists** | Full Three.js globe with `@react-three/fiber`, camera controller, markers for office locations, country outlines, postprocessing effects. |
| **What's needed** | Optimize for mobile (simplify or replace with static image on low-end devices), add markers for client locations or project regions, ensure it loads asynchronously (don't block LCP), consider using it as background for the "Global Credibility" section rather than a standalone page. |
| **Dependencies** | Performance budget (TS-5) |

### D-3: Innovation Lab / Live Demos

| Aspect | Detail |
|--------|--------|
| **Value Proposition** | Most IT services sites TELL you what they can do. Horizon Tech SHOWS you with live NLP demos, genetic algorithms, and interactive experiments. This is the "show, don't tell" differentiator. "Screenshots are evolving into interactive components." The Innovation Lab IS the portfolio for a company without published case studies yet. |
| **Complexity** | Low (already built) |
| **What exists** | `/innovation-lab` with NLP demos and genetic algorithm visualization. InnovationLab component in landing. |
| **What's needed** | Ensure demos work reliably, add brief explanatory context ("This NLP demo runs the same pipeline we deploy for clients"), link from service pages to relevant demos, consider adding 1-2 more demos that map to service areas (e.g., a simple IoT dashboard mockup, a cloud architecture visualizer). |
| **Dependencies** | None |

### D-4: i18n with Multi-Language URL Structure

| Aspect | Detail |
|--------|--------|
| **Value Proposition** | Most small/mid IT services companies have English-only sites. Supporting Bosnian for the local market, Arabic for Middle East expansion, and German for DACH region targeting creates SEO advantages in underserved search markets. Localized URLs (`/en/services/...`, `/bs/usluge/...`) give each language its own crawlable URL structure. |
| **Complexity** | HIGH |
| **What exists** | Nothing -- no i18n infrastructure. All content is hardcoded English strings. |
| **What's needed** | (1) `react-i18next` with `i18next-http-backend` for lazy-loaded translations and `i18next-browser-languagedetector` for auto-detection (verified via Context7: 2.1M weekly downloads, hooks-first, namespace support, TypeScript support, Suspense integration). (2) Translation JSON files organized as `/public/locales/{lng}/{ns}.json`. (3) Language-prefixed URL routes (`/en/`, `/bs/`, `/ar/`). (4) `hreflang` meta tags for each page linking all language variants. (5) Language switcher in header/footer. (6) RTL CSS support for Arabic (Tailwind CSS v4 has built-in RTL via `dir` attribute). (7) Externalize ALL user-facing strings from components into translation keys. |
| **Dependencies** | TS-6 (hreflang tags need helmet infrastructure), TS-7 (pre-render must handle all language variants) |
| **Risk** | This is the single highest-complexity feature. String extraction from 30+ existing components is tedious. URL restructuring affects routing, pre-rendering, and sitemap generation. RTL layout testing requires careful attention. Recommend building the infrastructure first with EN/BS only, add AR/RTL as a follow-up. |

### D-5: Localized SEO (Multi-Language Sitemaps, hreflang)

| Aspect | Detail |
|--------|--------|
| **Value Proposition** | Proper hreflang implementation tells Google which language version to show in which market. A multilingual sitemap with hreflang annotations is the gold standard for international SEO. Most competitors don't bother -- they have one English site. Horizon Tech can rank for "razvoj softvera Sarajevo" (Bosnian), "AI Entwicklung" (German), and "software development Sarajevo" (English) simultaneously. |
| **Complexity** | Medium (once i18n infrastructure exists) |
| **What exists** | Nothing. |
| **What's needed** | (1) Multilingual sitemap.xml with `<xhtml:link rel="alternate" hreflang="...">` entries, (2) `<link rel="alternate" hreflang="en" href="...">` in `<head>` for every page via Helmet, (3) `<link rel="canonical">` per page to prevent duplicate content, (4) x-default hreflang for language negotiation fallback. |
| **Dependencies** | D-4 (i18n infrastructure), TS-6 (SEO infrastructure), TS-7 (pre-rendering) |

### D-6: Embedded CTAs Throughout All Pages

| Aspect | Detail |
|--------|--------|
| **Value Proposition** | "Add CTAs across the site -- not just on the Contact page, embedding lead capture forms in service pages, footers, and blog posts to capture interest at every stage of the buyer journey." Most dev shop sites have a single contact page. Embedding contextual CTAs ("Discuss your AI project" on the AI service page, "Get a free cloud assessment" on the cloud page) captures intent at the moment of interest. |
| **Complexity** | Low |
| **What exists** | CTAs on hero section and service pages. Contact info in the contact page. |
| **What's needed** | Reusable CTA component with variants (inline banner, sticky footer bar, contextual sidebar). Each service page gets a service-specific CTA. Blog posts (when added) get CTAs. About page gets "Work with us" CTA. Bottom-of-page CTA strip on every page. |
| **Dependencies** | TS-4 (contact form must work) |

### D-7: FAQ Sections (Per-Page, Schema Markup)

| Aspect | Detail |
|--------|--------|
| **Value Proposition** | FAQ sections serve dual purpose: (1) answer visitor questions reducing friction, (2) target Google's "People also ask" featured snippets via FAQPage structured data. Per-service FAQs ("How long does a cloud migration take?") are SEO gold for long-tail queries. |
| **Complexity** | Low-Medium |
| **What exists** | `FAQSection` component on landing page with `TerminalAccordion`. |
| **What's needed** | Add FAQ sections to each service page with service-specific questions. Add FAQPage JSON-LD schema markup to each FAQ section. Ensure questions match real search queries (keyword research needed). |
| **Dependencies** | TS-6 (structured data infrastructure) |

### D-8: Performance Optimization (Core Web Vitals)

| Aspect | Detail |
|--------|--------|
| **Value Proposition** | "Search engines don't rank JavaScript frameworks -- they rank performance, structure, and user experience." Google uses Core Web Vitals (LCP, FID, CLS) as ranking signals. A fast site with good Vitals outranks a slow one with better content. Three.js and CRT effects are performance-heavy -- optimizing them while maintaining the aesthetic is a technical differentiator. |
| **Complexity** | Medium |
| **What exists** | `reportWebVitals.ts` for measurement. Code splitting via TanStack Router. Vendor chunking in Vite config. |
| **What's needed** | Lazy load Three.js globe (below-fold or on-demand), defer CRT animations until after LCP, optimize images (WebP/AVIF, responsive srcset), preload critical fonts and CSS, set performance budgets, measure and monitor CWV scores. |
| **Dependencies** | TS-5 (mobile performance), D-1 (CRT effects optimization), D-2 (globe optimization) |

### D-9: Cookie Consent / GDPR Compliance Banner

| Aspect | Detail |
|--------|--------|
| **Value Proposition** | Targeting EU/DACH market makes GDPR compliance mandatory, not optional. A proper cookie consent banner with granular opt-in/opt-out demonstrates professionalism and legal awareness. Shows the company understands EU regulations -- important for EU clients evaluating a non-EU vendor. |
| **Complexity** | Low-Medium |
| **What exists** | Nothing. |
| **What's needed** | Cookie consent banner with categories (necessary, analytics, marketing), persistent preferences in localStorage, conditional loading of analytics scripts based on consent, link to privacy policy. Consider a lightweight solution rather than heavy third-party widget. |
| **Dependencies** | TS-11 (privacy policy must exist first) |

### D-10: Open Graph / Social Sharing Optimization

| Aspect | Detail |
|--------|--------|
| **Value Proposition** | When someone shares a Horizon Tech page on LinkedIn, Twitter, or WhatsApp, it should show a branded preview card with title, description, and custom image -- not a blank card or generic fallback. LinkedIn is the primary B2B sharing platform. |
| **Complexity** | Low-Medium |
| **What exists** | Nothing -- no OG tags. |
| **What's needed** | Per-page OG tags (og:title, og:description, og:image, og:url, og:type), Twitter Card meta tags, custom OG images (at least a branded template for each page type -- service, about, contact), image dimensions 1200x630px for optimal display. |
| **Dependencies** | TS-6 (helmet infrastructure for meta tags) |

---

## Anti-Features

Features to deliberately NOT build. Common in the domain but counterproductive for Horizon Tech's specific situation.

### AF-1: Chatbot / AI Chat Widget

| Anti-Feature | Detail |
|-------------|--------|
| **Why avoid** | Generic chatbots on IT services sites are universally despised. They interrupt, they can't answer real technical questions, and they feel cheap. For a company projecting technical sophistication with CRT effects and 3D globes, a "Hi! How can I help you today?" popup is brand-destructive. 2026 trend: buyers are fatigued with chat widgets. |
| **What to do instead** | Clear contact form, visible email address, and "Schedule a Call" CTA. Let the Innovation Lab demos serve as the interactive engagement element. If chat is ever added, it should be a real person (Intercom-style), not a bot, and only during business hours. |

### AF-2: Generic Stock Photography

| Anti-Feature | Detail |
|-------------|--------|
| **Why avoid** | Stock photos of smiling people at laptops instantly signal "template website." Horizon Tech's CRT aesthetic, particle backgrounds, and 3D globe already provide visual richness. Stock photos would clash with and dilute the brand. |
| **What to do instead** | Use the existing design system (particles, gradients, geometric patterns, Three.js elements), real team photos where possible, technical diagrams/architecture visuals, and branded illustrations. Azure service icons are already in use -- this is the right direction. |

### AF-3: Blog (At This Stage)

| Anti-Feature | Detail |
|-------------|--------|
| **Why avoid** | PROJECT.md explicitly marks blog as out of scope. A blog with 2-3 posts looks worse than no blog at all ("last post: 6 months ago" signals abandonment). Building blog infrastructure before having a content pipeline is wasted effort. |
| **What to do instead** | Build the route and placeholder ("Coming Soon" or don't expose the link). Focus content energy on service page copy and FAQ sections, which have higher SEO ROI per page. Add blog when there's a commitment to publish 2-4 articles/month. |

### AF-4: Pricing Page / Calculator

| Anti-Feature | Detail |
|-------------|--------|
| **Why avoid** | Custom software development is project-based, not commodity-priced. Showing prices invites bottom-fishing and attracts unqualified leads. Competitors who show pricing are typically staff augmentation firms or template shops -- not the positioning Horizon Tech wants. |
| **What to do instead** | "Custom pricing based on project scope" messaging. Guide visitors toward consultation. Use the contact form to qualify leads (subject dropdown already has "New Project" option). The `PricingSection` component that exists should be either removed or repurposed as a "How We Work" / engagement model section. |

### AF-5: Auto-Playing Video

| Anti-Feature | Detail |
|-------------|--------|
| **Why avoid** | Auto-playing video kills performance (LCP), annoys mobile users on data plans, and is blocked by many browsers. It competes with the CRT animation and globe for attention. |
| **What to do instead** | If video testimonials or demos are added, use click-to-play with a thumbnail. The CRT boot sequence IS the "video" equivalent -- it's an animated reveal that feels like a video without the performance cost. |

### AF-6: Excessive Animation / Parallax Scrolling

| Anti-Feature | Detail |
|-------------|--------|
| **Why avoid** | The CRT effects and Three.js globe already consume animation budget. Adding parallax scrolling, floating elements, and heavy scroll-triggered animations on top creates visual noise and kills performance. More motion does not mean more premium. |
| **What to do instead** | Use motion strategically: CRT effects for hero, subtle fade/slide reveals for content sections (already using Motion/Framer Motion), counter animations for stats. Respect `prefers-reduced-motion` media query for accessibility. |

### AF-7: Multi-Step Wizard Contact Form

| Anti-Feature | Detail |
|-------------|--------|
| **Why avoid** | Multi-step forms work for complex product configurations, not service inquiries. B2B visitors want to say "I need X, here's my email" and leave. Adding steps (budget range, timeline, project type) before they can submit creates friction. The existing form with subject dropdown is the right complexity level. |
| **What to do instead** | Keep the current form structure. Add progressive profiling AFTER initial contact -- the sales team asks detailed questions in the follow-up call, not the website. |

### AF-8: User Accounts / Login for Corporate Visitors

| Anti-Feature | Detail |
|-------------|--------|
| **Why avoid** | PROJECT.md explicitly states "User accounts/dashboard -- corporate site, not a SaaS app." The existing auth system is for the admin panel and innovation lab, NOT for corporate visitors browsing services. A "Sign Up" button on a consulting website confuses the value proposition. |
| **What to do instead** | Keep auth for admin routes only. Ensure the login/register flows are not visible in the main navigation or accessible from corporate pages. The corporate site and the internal platform share a codebase but should feel like separate products. |

### AF-9: Heavy Third-Party Analytics / Tracking Scripts

| Anti-Feature | Detail |
|-------------|--------|
| **Why avoid** | Every third-party script (Google Analytics, Hotjar, Facebook Pixel, Intercom, HubSpot tracker) adds to page weight, slows LCP, and creates GDPR liability. Loading 5+ tracking scripts is common on corporate sites and is a major performance anti-pattern. |
| **What to do instead** | Start with lightweight, privacy-respecting analytics (Plausible, Umami, or self-hosted Matomo). One analytics tool, loaded conditionally after cookie consent. Use `web-vitals` (already in devDependencies) for performance monitoring. Add more tracking only when there's a proven need. |

---

## Feature Dependencies

```
                   TS-6 (SEO Infrastructure - Helmet)
                  /       |            \
                 /        |             \
    TS-7 (Pre-render)  D-10 (OG Tags)   D-5 (hreflang)
         |                                    |
         |                               D-4 (i18n)
         |                              /     |
         +-------- requires both ------+      |
                                        D-5 (Localized SEO)

    TS-4 (Contact Form) -----> D-6 (Embedded CTAs)

    TS-3 (Social Proof) -----> TS-2 (Service Pages need testimonials)

    TS-11 (Legal Pages) -----> D-9 (Cookie Consent links to Privacy)

    D-1 (CRT Polish) -----\
    D-2 (Globe Optimize) ---+---> D-8 (Performance / Core Web Vitals)
    TS-5 (Mobile) ---------/

    TS-8 (Navigation) is independent but affects all pages.
    TS-9 (About Page) is independent.
```

### Critical Path

The longest dependency chain is:

1. **TS-6** (Helmet/meta tag infrastructure)
2. **D-4** (i18n with react-i18next, string extraction, URL structure)
3. **D-5** (Multilingual sitemap, hreflang tags)
4. **TS-7** (Pre-rendering all language variants)

This chain should drive phase ordering. SEO infrastructure must come first because everything else builds on it.

### Parallel Work Streams

These can proceed independently:

- **Stream A:** TS-2 (service page content) + TS-3 (social proof) + D-7 (FAQ sections)
- **Stream B:** TS-6 (SEO infra) + D-10 (OG tags) + TS-7 (pre-rendering)
- **Stream C:** D-4 (i18n setup) + string extraction
- **Stream D:** D-1 (CRT polish) + D-2 (globe optimize) + D-8 (performance)
- **Stream E:** TS-4 (contact form wiring) + D-6 (embedded CTAs) + D-9 (cookie consent)

---

## MVP Recommendation

For the first deliverable milestone, prioritize features that make the site functional as a lead generation tool:

### Must Ship (Phase 1)

1. **TS-6** - SEO infrastructure (react-helmet, per-route meta tags, JSON-LD)
2. **TS-1** - Polish hero section messaging (outcome-focused copy)
3. **TS-2** - Enhance service pages (add meta tags, FAQ, cross-links)
4. **TS-3** - Social proof with real content (logos, stats, testimonials scattered throughout)
5. **TS-4** - Wire contact form to backend API
6. **TS-8** - Clean up navigation (Services dropdown, persistent CTA)
7. **D-6** - Embed CTAs on all pages
8. **D-7** - FAQ sections with structured data on service pages
9. **D-10** - Open Graph tags for social sharing

### Should Ship (Phase 2)

10. **D-4** - i18n infrastructure (EN + BS, string extraction, language switcher)
11. **D-5** - Localized SEO (hreflang, multilingual sitemap)
12. **TS-7** - Pre-rendering (after i18n URLs are stable)
13. **D-8** - Performance optimization pass
14. **D-9** - Cookie consent / GDPR banner

### Defer to Post-MVP

- **D-4 RTL support** (Arabic) -- build infrastructure but defer actual RTL CSS and Arabic translations
- **Additional Innovation Lab demos** -- nice to have, not blocking lead generation
- **Blog infrastructure** -- defer until content pipeline exists
- **Case studies page** -- defer until real case studies are written

---

## Complexity Summary

| Complexity | Features |
|------------|----------|
| **Low** | TS-5 (mobile audit), TS-9 (about page), TS-10 (footer), TS-11 (legal), D-1 (CRT polish), D-6 (CTAs) |
| **Low-Medium** | TS-3 (social proof), TS-8 (navigation), D-7 (FAQ + schema), D-9 (cookie consent), D-10 (OG tags) |
| **Medium** | TS-1 (hero refinement), TS-2 (service page enhancement), TS-4 (contact form wiring), D-2 (globe optimization), D-5 (localized SEO), D-8 (performance) |
| **High** | TS-6 (SEO infrastructure), TS-7 (pre-rendering), D-4 (i18n full implementation) |

---

## Sources

### HIGH Confidence (Context7, Official Docs)
- react-i18next documentation via Context7 (`/i18next/react-i18next`): hooks API, namespaces, lazy loading, TypeScript support, Suspense integration
- @dr.pogodin/react-helmet documentation via Context7 (`/birdofpreyru/react-helmet`): React 19 support, SEO tag prioritization, OG/Twitter Card meta tags, JSON-LD structured data
- i18next documentation via Context7 (`/websites/i18next`): benchmark score 95.9, high reputation
- [TanStack Router Document Head Management](https://tanstack.com/router/v1/docs/framework/react/guide/document-head-management)
- [SEO Optimization for React + Vite Apps (DEV Community)](https://dev.to/ali_dz/optimizing-seo-in-a-react-vite-project-the-ultimate-guide-3mbh)

### MEDIUM Confidence (Multiple Sources Agreeing)
- [Best B2B Websites 2026 (Tilipman Digital)](https://www.tilipmandigital.com/resource-center/articles/best-b2b-websites) -- clear value prop, trust signals, conversion elements
- [Social Proof on Consulting Websites (Knapsack Creative)](https://knapsackcreative.com/blog-industry/consulting-website-social-proof) -- placement patterns, quality over quantity
- [B2B Landing Page Best Practices (Instapage)](https://instapage.com/blog/b2b-landing-page-best-practices) -- conversion optimization
- [B2B Website Strategy 2026 (Studio5 Creative)](https://studio5creative.com/b2b-website-strategy-for-2026/) -- UX, CRO, SEO strategy
- [Social Proof Statistics 2026 (WiserReview)](https://wiserreview.com/blog/social-proof-statistics/) -- 90% buyer influence, 400% logo conversion lift, 45% traffic increase with testimonials
- [Lead Generation Forms Best Practices (Monday.com)](https://monday.com/blog/crm-and-sales/lead-generation-forms/) -- field count optimization
- [SEO Best Practices 2026 (First Page Sage)](https://firstpagesage.com/seo-blog/seo-best-practices/) -- pillar pages, content strategy
- [B2B Lead Generation for Tech Companies (SalesBread)](https://salesbread.com/lead-generation-for-tech-companies/) -- multi-channel approach

### LOW Confidence (Single Source, Needs Validation)
- Pre-rendering with Vite + TanStack Router: specific tooling compatibility not fully verified. `vite-plugin-prerender` and `react-snap` compatibility with TanStack Router's file-based routing needs testing during implementation.
- Three.js rendering in headless browser during pre-render: assumed to be problematic based on general WebGL limitations, but specific behavior with `react-snap` or `prerender.io` not confirmed.
