# Requirements

## v1: Landing Page

### Hero Section
- [ ] **HERO-01**: Visitor sees an outcome-focused headline within 3 seconds of landing (not a feature list)
- [ ] **HERO-02**: Visitor sees above-the-fold social proof (logo strip or key stat) immediately below the headline
- [ ] **HERO-03**: Visitor sees a primary CTA button ("Get in Touch" / "Let's Talk") prominently in the hero
- [ ] **HERO-04**: CRT boot animation and DecryptedText reveal remain as the signature entrance effect
- [ ] **HERO-05**: Hero section loads and becomes interactive within acceptable LCP threshold (<2.5s)

### Social Proof
- [ ] **PROOF-01**: Visitor sees real client logos displayed on the landing page
- [ ] **PROOF-02**: Visitor sees experience stats (years, projects, technologies) with animated counters
- [ ] **PROOF-03**: Visitor sees 3-5 testimonials with name, role, and company attribution
- [ ] **PROOF-04**: Social proof elements are scattered throughout the landing page (near CTAs, between sections), not isolated in one block

### Navigation
- [ ] **NAV-01**: Visitor can access all service areas from a Services dropdown in the main navigation
- [ ] **NAV-02**: Visitor sees a persistent CTA button ("Get in Touch") in the header at all times
- [ ] **NAV-03**: Navigation is responsive and works correctly on mobile devices

### CRT Aesthetic
- [ ] **CRT-01**: CRT scanline and glow effects are polished and consistent in dark mode
- [ ] **CRT-02**: Subtle CRT-inspired effects (section reveals, transitions, loading states) extend beyond just the hero
- [ ] **CRT-03**: CRT effects respect `prefers-reduced-motion` for accessibility
- [ ] **CRT-04**: CRT effects do not degrade performance (no impact on LCP or CLS)

### 3D Globe
- [ ] **GLOBE-01**: Globe loads asynchronously without blocking initial page render
- [ ] **GLOBE-02**: Globe is simplified or replaced with a static fallback on low-end mobile devices
- [ ] **GLOBE-03**: Globe visualization is polished (smooth interactions, proper lighting, clean markers)

### Embedded CTAs
- [ ] **CTA-01**: Each major landing page section has a contextual CTA relevant to that section's content
- [ ] **CTA-02**: Visitor can reach the contact form from any section of the landing page within 1 click
- [ ] **CTA-03**: A bottom-of-page CTA strip provides a final conversion opportunity before the footer

### FAQ Section
- [ ] **FAQ-01**: Landing page includes a FAQ section with common questions about Horizon Tech's services
- [ ] **FAQ-02**: FAQ uses the existing TerminalAccordion component styled with the CRT aesthetic
- [ ] **FAQ-03**: FAQ section includes FAQPage JSON-LD structured data for Google featured snippets

### Light Mode Fix
- [ ] **THEME-01**: Light mode displays a clean, professional color palette (no gray-everywhere issue)
- [ ] **THEME-02**: Light mode and dark mode are both visually polished and intentional
- [ ] **THEME-03**: CRT effects are dark-mode-specific; light mode gets its own clean visual treatment
- [ ] **THEME-04**: Theme toggle works correctly and persists user preference

---

## v2 (Deferred)

### SEO & Pre-rendering
- Service pages with dedicated URLs and per-page meta tags
- SEO infrastructure (react-helmet, structured data, sitemap)
- Pre-rendering for SPA SEO
- Open Graph / social sharing optimization
- Performance optimization pass (Core Web Vitals)

### Internationalization
- i18n infrastructure with react-i18next (EN + BS)
- Multi-language URL structure (/en/, /bs/)
- RTL layout support for Arabic
- Localized SEO (hreflang, multilingual sitemap)
- Language switcher

### Services & Lead Capture
- Dedicated service page enhancement (FAQ, testimonials, cross-links per page)
- Contact form wired to backend API
- Cookie consent / GDPR banner
- Legal pages content (Privacy, Terms)

### Content & Structure
- About/Company page with real content
- Footer with essential links
- Innovation Lab linking from service pages

---

## Out of Scope

- Portfolio/case studies — deferred to after core site
- Blog/content marketing — no content pipeline yet
- E-commerce/payments — not a product sales site
- User accounts/dashboard — corporate site, not SaaS
- Pricing page — custom dev is not commodity-priced
- Chatbot/AI widget — brand-destructive for this aesthetic
- Full 20+ language translations — infrastructure only, user translates later
- Auto-playing video — CRT animation serves this purpose

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| HERO-01 | Phase 3 | Pending |
| HERO-02 | Phase 3 | Pending |
| HERO-03 | Phase 3 | Pending |
| HERO-04 | Phase 3 | Pending |
| HERO-05 | Phase 3 | Pending |
| PROOF-01 | Phase 4 | Pending |
| PROOF-02 | Phase 4 | Pending |
| PROOF-03 | Phase 4 | Pending |
| PROOF-04 | Phase 4 | Pending |
| NAV-01 | Phase 2 | Pending |
| NAV-02 | Phase 2 | Pending |
| NAV-03 | Phase 2 | Pending |
| CRT-01 | Phase 1 | Pending |
| CRT-02 | Phase 1 | Pending |
| CRT-03 | Phase 1 | Pending |
| CRT-04 | Phase 1 | Pending |
| GLOBE-01 | Phase 5 | Pending |
| GLOBE-02 | Phase 5 | Pending |
| GLOBE-03 | Phase 5 | Pending |
| CTA-01 | Phase 4 | Pending |
| CTA-02 | Phase 4 | Pending |
| CTA-03 | Phase 4 | Pending |
| FAQ-01 | Phase 5 | Pending |
| FAQ-02 | Phase 5 | Pending |
| FAQ-03 | Phase 5 | Pending |
| THEME-01 | Phase 1 | Pending |
| THEME-02 | Phase 1 | Pending |
| THEME-03 | Phase 1 | Pending |
| THEME-04 | Phase 1 | Pending |

---
*Last updated: 2026-02-07 after roadmap creation*
