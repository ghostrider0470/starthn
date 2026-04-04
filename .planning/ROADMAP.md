# Roadmap: Horizon Tech Landing Page

## Overview

Transform the existing Horizon Tech landing page into a polished, conversion-optimized experience that communicates credibility and technical sophistication. The work moves from fixing the broken visual foundation (theme and CRT aesthetic), through building the page skeleton (navigation), to delivering each content section (hero, social proof with CTAs, FAQ and globe). Every phase delivers a visually verifiable slice of the landing page.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Theme & CRT Aesthetic** - Fix broken light mode and polish the CRT dark mode aesthetic across the site
- [ ] **Phase 2: Navigation & Page Structure** - Build the navigation skeleton with services dropdown, persistent CTA, and responsive mobile support
- [ ] **Phase 3: Hero Section** - Deliver the above-the-fold experience with outcome-focused messaging, boot animation, and primary CTA
- [ ] **Phase 4: Social Proof & Conversion Sections** - Build the landing page body with client logos, stats, testimonials, and contextual CTAs throughout
- [ ] **Phase 5: FAQ & 3D Globe Polish** - Add the FAQ section with structured data and polish the globe visualization with performance fallbacks

## Phase Details

### Phase 1: Theme & CRT Aesthetic
**Goal**: Both light and dark mode look intentional and polished, with CRT effects properly scoped to dark mode and respecting accessibility preferences
**Depends on**: Nothing (first phase)
**Requirements**: THEME-01, THEME-02, THEME-03, THEME-04, CRT-01, CRT-02, CRT-03, CRT-04
**Success Criteria** (what must be TRUE):
  1. Light mode displays a clean, professional color palette with no gray-washed or broken areas
  2. Dark mode has consistent, polished CRT scanline and glow effects across all visible sections (not just the hero)
  3. Toggling between light and dark mode produces two distinctly styled but equally polished experiences
  4. Users with `prefers-reduced-motion` enabled see no CRT animations or transitions
  5. CRT effects cause no visible layout shift or delay in initial page render
**Plans**: TBD

Plans:
- [ ] 01-01: Fix light mode color palette and establish dual-theme design tokens
- [ ] 01-02: Polish CRT effects (scanlines, glow, section reveals) and scope to dark mode only
- [ ] 01-03: Add reduced-motion support and verify CRT performance impact

### Phase 2: Navigation & Page Structure
**Goal**: Visitors can navigate between all service areas and reach the contact action from any point on the page
**Depends on**: Phase 1
**Requirements**: NAV-01, NAV-02, NAV-03
**Success Criteria** (what must be TRUE):
  1. Visitor can open a Services dropdown in the header and see links to all service areas (App, Web, Cloud, IoT, AI/ML)
  2. A "Get in Touch" CTA button is visible in the header at all viewport sizes without scrolling
  3. Navigation collapses into a functional mobile menu on small screens with all links and CTA accessible
**Plans**: TBD

Plans:
- [ ] 02-01: Build desktop navigation with Services dropdown and persistent header CTA
- [ ] 02-02: Build responsive mobile navigation with menu toggle and full link access

### Phase 3: Hero Section
**Goal**: First-time visitors immediately understand what Horizon Tech offers and feel compelled to engage
**Depends on**: Phase 1, Phase 2
**Requirements**: HERO-01, HERO-02, HERO-03, HERO-04, HERO-05
**Success Criteria** (what must be TRUE):
  1. Visitor reads an outcome-focused headline (not a feature list) within 3 seconds of the page loading
  2. Client logos or a key credibility stat appear directly below the headline, visible without scrolling
  3. A prominent "Get in Touch" or "Let's Talk" CTA button is visible above the fold
  4. The CRT boot animation and DecryptedText reveal play as the signature entrance effect in dark mode
  5. The hero section reaches Largest Contentful Paint in under 2.5 seconds on a standard connection
**Plans**: TBD

Plans:
- [ ] 03-01: Build hero layout with outcome headline, inline social proof strip, and primary CTA
- [ ] 03-02: Integrate CRT boot animation and DecryptedText entrance effect
- [ ] 03-03: Optimize hero LCP and verify performance threshold

### Phase 4: Social Proof & Conversion Sections
**Goal**: Visitors encounter credibility signals and conversion opportunities throughout the landing page, not just in one isolated block
**Depends on**: Phase 3
**Requirements**: PROOF-01, PROOF-02, PROOF-03, PROOF-04, CTA-01, CTA-02, CTA-03
**Success Criteria** (what must be TRUE):
  1. Real client logos are displayed on the landing page in a recognizable logo strip or grid
  2. Experience stats (years in business, projects completed, technologies used) animate into view with counters
  3. Three to five testimonials with name, role, and company attribution are visible on the page
  4. Each major landing page section includes a contextual CTA relevant to that section's content (not generic "Contact Us" everywhere)
  5. A visitor can reach the contact form from any section within one click, and a final CTA strip appears before the footer
**Plans**: TBD

Plans:
- [ ] 04-01: Build client logo strip and animated experience stats section
- [ ] 04-02: Build testimonials section with attributed quotes
- [ ] 04-03: Add contextual per-section CTAs and bottom-of-page CTA strip

### Phase 5: FAQ & 3D Globe Polish
**Goal**: The landing page has a FAQ section targeting search snippets and a polished globe that loads without blocking the page
**Depends on**: Phase 1, Phase 4
**Requirements**: FAQ-01, FAQ-02, FAQ-03, GLOBE-01, GLOBE-02, GLOBE-03
**Success Criteria** (what must be TRUE):
  1. A FAQ section with common questions about Horizon Tech's services is visible on the landing page, styled with the TerminalAccordion component
  2. The FAQ section includes valid FAQPage JSON-LD structured data detectable by Google Rich Results Test
  3. The 3D globe loads asynchronously without delaying the initial page render or blocking interactivity
  4. On low-end mobile devices, the globe is replaced with a static fallback image or simplified visualization
  5. The globe has smooth interactions, proper lighting, and clean location markers
**Plans**: TBD

Plans:
- [ ] 05-01: Build FAQ section with TerminalAccordion and FAQPage JSON-LD structured data
- [ ] 05-02: Optimize globe async loading with static fallback for low-end devices
- [ ] 05-03: Polish globe visualization (lighting, markers, interactions)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Theme & CRT Aesthetic | 0/3 | Not started | - |
| 2. Navigation & Page Structure | 0/2 | Not started | - |
| 3. Hero Section | 0/3 | Not started | - |
| 4. Social Proof & Conversion Sections | 0/3 | Not started | - |
| 5. FAQ & 3D Globe Polish | 0/3 | Not started | - |
