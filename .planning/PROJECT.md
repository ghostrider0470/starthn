# Horizon Tech

## What This Is

Corporate website for Horizon Tech d.o.o. Sarajevo — a full-stack technology company offering App, Web, Cloud, IoT, AI, and ML development services. The site must attract worldwide corporate clients while projecting an innovative, future-forward identity. It's a lead generation engine: look exceptional, rank well, convert visitors into contacts.

## Core Value

The website must generate inbound leads from worldwide search traffic through excellent SEO and a landing page that instantly communicates credibility and technical sophistication.

## Requirements

### Validated

- ✓ React 19 SPA with TanStack Router file-based routing — existing
- ✓ Tailwind CSS v4 styling with shadcn/ui component system — existing
- ✓ Dark/light/system theme support — existing (light mode needs visual fix, currently gray/broken)
- ✓ CRT effects and scanlines — existing, signature aesthetic for dark mode
- ✓ JWT authentication with token refresh — existing
- ✓ Axios API client with interceptors — existing
- ✓ 3D globe visualization (Three.js) — existing, keep and polish
- ✓ Responsive design with mobile navigation — existing
- ✓ Code splitting and vendor chunking — existing
- ✓ Azure Static Web Apps deployment config — existing

### Active

- [ ] Captivating landing page (Hero → Services → Why Us → Social Proof → CTA)
- [ ] i18n infrastructure with react-i18next (English + Bosnian + RTL support)
- [ ] SEO pre-rendering for SPA (meta tags, structured data, sitemap, pre-render)
- [ ] Services overview page with visual cards for each service area
- [ ] Dedicated SEO-optimized page per service (App, Web, Cloud, IoT, AI/ML)
- [ ] Contact form for lead capture
- [ ] Social proof section (client logos, experience stats, testimonials)
- [ ] Multi-language URL structure for SEO (/en/, /bs/, /ar/)
- [ ] RTL layout support for Arabic and future RTL languages

### Out of Scope

- Portfolio/case studies — deferred to after core site is complete
- Blog/content marketing — not in initial scope
- E-commerce/payments — not a product sales site
- User accounts/dashboard — corporate site, not a SaaS app
- Full translations for 20+ languages — user will add translations later, we build the infrastructure

## Context

**Existing codebase:** Brownfield React 19 SPA with substantial component library (30+ shadcn/ui components), TanStack ecosystem (Router, Query, Form), Three.js globe visualization, innovation lab with NLP demos, and admin routes. The site needs a selective rebuild — restructure pages for SEO and corporate messaging while keeping the branding and reusable components.

**Company identity:** Horizon Tech d.o.o. is registered in Sarajevo, Bosnia and Herzegovina. The brand straddles two worlds: innovative startup energy and enterprise-grade reliability. The visual identity is dark-mode-only with signature CRT effects (scanlines, glow, retro-futuristic feel), a 3D globe, and distinctive color palette. These are core brand elements to keep and polish — not replace.

**Design direction:** Dark mode is primary with CRT effects, scanlines, and the globe as signature elements. Light mode should also work but currently looks broken (gray everywhere). Both modes need to look polished — dark mode futuristic/premium, light mode clean/professional. CRT effects are dark-mode-specific.

**Target markets:** Global, with emphasis on EU (German-speaking DACH region), Middle East (Arabic), and local Balkan market (Bosnian/Croatian/Serbian). The i18n infrastructure must support 20+ languages eventually but ships with English, Bosnian, and RTL layout support.

**Service areas:** Application Development, Web Development, Cloud Engineering, IoT Solutions, AI/ML Development. Each area gets a dedicated page for SEO targeting (e.g., "AI development company Sarajevo").

**Differentiators:**
- Full-stack breadth — one team covers App, Web, Cloud, IoT, AI/ML
- EU-quality work at competitive Sarajevo pricing
- Startup speed with enterprise quality standards

**Social proof available:** Client logos, experience statistics (years, projects, technologies), and testimonials — all real content ready to be integrated.

## Constraints

- **Tech stack**: Must remain React SPA — no framework migration (Next.js, Remix). SEO achieved through pre-rendering tools.
- **i18n approach**: react-i18next for internationalization. Translations for EN and BS provided. RTL CSS layout support built in. User handles all other language translations.
- **Rendering**: SPA with pre-rendering for SEO (react-snap, prerender.io, or similar). No SSR.
- **Deployment**: Azure Static Web Apps (existing config).
- **Branding**: Keep existing color scheme, CRT effects (dark mode), scanlines, and globe. Fix light mode colors. Polish and elevate existing aesthetic.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Stay with React SPA, no SSR framework | User preference, existing investment in TanStack ecosystem | — Pending |
| SEO via pre-rendering | Avoids framework migration while enabling search indexing | — Pending |
| react-i18next for i18n | Industry standard, supports 20+ languages, RTL-aware | — Pending |
| Landing page first priority | First impression drives conversions, most impactful for lead gen | — Pending |
| Dedicated service pages | Each service area gets its own URL for targeted SEO ranking | — Pending |
| Fix light mode | Currently broken (gray everywhere), needs proper color palette | Confirmed |
| Keep globe, CRT effects, scanlines | Signature dark-mode visual elements — polish, don't replace | Confirmed |

---
*Last updated: 2026-02-07 after initialization*
