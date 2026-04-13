# StartHN Rebrand — Design Spec

**Date:** 2026-04-13
**Approach:** Layered Rebrand (Phase-based, each phase deployable)
**Domain:** starthn.ba (using Cloudflare Workers URL until domain is configured)

## Business Context

StartHN is a **računovodstvena agencija** (accounting agency) based in Sarajevo, Bosnia. They serve micro, small, and medium businesses, freelancers, and associations with bookkeeping, tax consulting, virtual CFO services, and business education.

**Contact:**
- Phone: +387 61/135-377
- Email: info@starthn.ba / klijenti@starthn.ba
- Address: Vilsonovo šetalište 9, Mašinski fakultet, 3. sprat — CRP Inkubator
- Hours: Mon–Fri 8:00–16:00
- Social: Facebook, LinkedIn, Instagram

## Typography

**Heading font:** Plus Jakarta Sans (Google Fonts, free)
- Closest free alternative to GT Walsheim Pro used on existing WordPress site
- Rounded geometric feel with strong personality at display sizes
- Weights: 800 (display), 700 (h1), 600 (h2/h3/cta)

**Body font:** Public Sans (Google Fonts, free)
- Same family used on existing WordPress site
- Weights: 400 (body), 500 (nav links), 600 (emphasis)

### Type Scale

| Role      | Size | Weight | Font           | Tracking      |
|-----------|------|--------|----------------|---------------|
| Display   | 48px | 800    | Plus Jakarta   | -0.8px        |
| H1        | 36px | 700    | Plus Jakarta   | -0.5px        |
| H2        | 24px | 600    | Plus Jakarta   | normal        |
| H3        | 18px | 600    | Plus Jakarta   | normal        |
| Overline  | 11px | 600    | Plus Jakarta   | 2px uppercase |
| Body      | 16px | 400    | Public Sans    | normal        |
| Small     | 14px | 400    | Public Sans    | normal        |
| CTA       | 14px | 600    | Plus Jakarta   | 0.2px         |

## Color Palette

### Brand Colors

| Name        | Hex       | Role                          |
|-------------|-----------|-------------------------------|
| Dark Gold   | `#B8860B` | Light mode primary (CTAs, links, active) |
| Gold        | `#DEBD4E` | Dark mode primary (CTAs, links, active)  |
| Bright Gold | `#E8CC6A` | Hover / highlight states      |
| Deep Gold   | `#9A7209` | Active / pressed states       |

### Light Mode

| Token        | Hex       | Usage                    |
|--------------|-----------|--------------------------|
| Background   | `#FAFAFA` | Page background          |
| Surface      | `#FFFFFF` | Cards, nav, elevated     |
| Warm Cream   | `#F5F0E0` | Accent/highlighted sections |
| Foreground   | `#1E2023` | Headings, primary text   |
| Muted        | `#4B535D` | Body text, descriptions  |
| Border       | `#E8E4D8` | Card borders, dividers   |

### Dark Mode

| Token        | Hex       | Usage                    |
|--------------|-----------|--------------------------|
| Background   | `#0F1115` | Page background          |
| Surface      | `#1A1D23` | Cards, nav, elevated     |
| Warm Dark    | `#1E1B14` | Accent/highlighted sections |
| Foreground   | `#F0ECE0` | Headings, primary text   |
| Muted        | `#9DA3AD` | Body text, descriptions  |
| Border       | `#2A2D33` | Card borders, dividers   |

### Gradients

| Name            | Value                                        | Usage                      |
|-----------------|----------------------------------------------|----------------------------|
| Primary         | `135deg, #DEBD4E → #B8860B`                  | Hero, brand accents        |
| Warm Light      | `135deg, #FBF8EF → #F5F0E0 → #EDE4C8`       | Featured sections (light)  |
| Warm Dark       | `135deg, #1A1810 → #1E1B14 → #22200F`       | Featured sections (dark)   |
| Deep Gold       | `135deg, #B8860B → #9A7209 → #7D5C07`       | Footer, dark CTAs          |

## Page Structure

### Pages to Keep and Rebrand

| Page             | Route                  | Content Change              |
|------------------|------------------------|-----------------------------|
| Home             | `/{locale}/`           | Full content rewrite — accounting hero, services, testimonials, CTA |
| About / O nama   | `/{locale}/about`      | Company info, mission/vision/values from WordPress site |
| Services         | `/{locale}/services`   | Accounting services: bookkeeping, tax, virtual CFO, education |
| Contact          | `/{locale}/contact`    | StartHN contact info, form, location |
| Blog             | `/{locale}/blog`       | Uspješne priče + accounting articles |
| Team             | `/{locale}/team`       | Accounting team profiles |
| Privacy          | `/{locale}/privacy`    | Rebrand company name/email |
| Terms            | `/{locale}/terms`      | Rebrand company name/email |
| FAQs             | `/{locale}/faqs`       | New page — common accounting questions |
| Chat Widget      | (global component)     | Rebrand to "Chat with Start HN" |

### Pages to Remove

| Page             | Route                        | Reason                |
|------------------|------------------------------|-----------------------|
| Innovation Lab   | `/{locale}/innovation-lab`   | Tech-specific, not relevant |
| Case Studies     | `/{locale}/case-studies/*`   | Tech-specific, not relevant |

## Locales

Two locales only:
- `en-US` — English (default)
- `bs-BA` — Bosnian

## Logo

Use existing logo from WordPress site: `https://starthn.ba/wp-content/uploads/2024/04/IMG_7508__1_-removebg-preview.png`

Generate favicon and PWA icons from the logo. Update `manifest.json` with StartHN branding.

## Implementation Phases

### Phase 1: Foundation
Theme (CSS custom properties for gold palette + dark mode), font swap to Plus Jakarta Sans + Public Sans, logo download and swap, manifest/favicon, global branding (navbar, footer, meta tags, SEO defaults in `seo.ts`). Replace all remaining "Horizon" alt text and hardcoded strings in shared components.

### Phase 2: Content
Translation files (`en-US` + `bs-BA`) — replace all Horizon Tech messaging with StartHN accounting content. Page-by-page content updates for all kept pages.

### Phase 3: Structure
Remove Innovation Lab and Case Studies routes/components/data. Add FAQs page. Update services page with accounting-specific service listings from the WordPress site.

### Phase 4: Polish
Hero section redesign with warm gradient background and overline label. Testimonials section using quotes from WordPress site. Contact form with service dropdown. Service list with numbered row layout (no cards/icons). Final cross-browser and responsive testing.

## Design Decisions

- **No card-based service layouts** — use clean numbered list rows with name + description + arrow
- **No emoji/icon decorators** — typography and gold accent color carry the visual weight
- **Warm-tinted accent surfaces** instead of flat grays — gives premium, trustworthy accounting brand feel
- **Gold flips between modes**: darker `#B8860B` on light backgrounds, brighter `#DEBD4E` on dark backgrounds for contrast
- **Plus Jakarta Sans** chosen over Inter (too neutral/technical) and DM Sans (too compact) — best balance of warmth and professionalism for an accounting firm
