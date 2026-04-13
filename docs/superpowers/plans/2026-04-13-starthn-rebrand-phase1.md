# StartHN Rebrand Phase 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the visual foundation from Horizon Tech (orange/purple tech company) to Start HN (gold/amber accounting agency) — theme colors, fonts, logo, manifest, and all global branding strings.

**Architecture:** All color tokens live in CSS custom properties in `src/styles.css`. Fonts load via Google Fonts in the root HTML head. Logo images sit in `public/`. Global branding strings are scattered across components and the root route — each gets updated to Start HN. After this phase the site renders with the correct brand identity everywhere, though page content is still Horizon's.

**Tech Stack:** CSS custom properties (oklch), Google Fonts, TanStack Start (React), Tailwind CSS v4

**Design spec:** `docs/superpowers/specs/2026-04-13-starthn-rebrand-design.md`

---

### Task 1: Replace Color Palette in styles.css

**Files:**
- Modify: `src/styles.css:118-155` (`:root` light mode variables)
- Modify: `src/styles.css:158-194` (`.dark` dark mode variables)
- Modify: `src/styles.css:218-273` (gradient utilities — rename and recolor)

- [ ] **Step 1: Replace `:root` light mode colors**

In `src/styles.css`, replace lines 118-155 (the second `:root` block) with:

```css
:root {
  --radius: 0.625rem;
  --background: oklch(0.98 0.005 80);
  --foreground: oklch(0.15 0.02 250);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.15 0.02 250);
  --popover: oklch(0.995 0.003 80);
  --popover-foreground: oklch(0.15 0.02 250);
  /* Start HN primary: dark gold */
  --primary: oklch(0.55 0.14 85);
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.96 0.01 80);
  --secondary-foreground: oklch(0.25 0.02 250);
  --muted: oklch(0.94 0.01 80);
  --muted-foreground: oklch(0.4 0.02 250);
  /* Accent: bright gold */
  --accent: oklch(0.78 0.14 90);
  --accent-foreground: oklch(0.15 0.02 250);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.98 0 0);
  --border: oklch(0.92 0.01 80);
  --input: oklch(0.92 0.01 80);
  /* Ring: matching primary gold */
  --ring: oklch(0.55 0.14 85);
  /* Chart colors: gold spectrum */
  --chart-1: oklch(0.55 0.14 85);   /* Dark gold */
  --chart-2: oklch(0.65 0.14 88);   /* Gold */
  --chart-3: oklch(0.78 0.14 90);   /* Bright gold */
  --chart-4: oklch(0.85 0.1 85);    /* Light gold */
  --chart-5: oklch(0.45 0.12 80);   /* Deep gold */
  --sidebar: oklch(0.97 0.005 80);
  --sidebar-foreground: oklch(0.15 0.02 250);
  --sidebar-primary: oklch(0.55 0.14 85);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(0.94 0.01 80);
  --sidebar-accent-foreground: oklch(0.15 0.02 250);
  --sidebar-border: oklch(0.92 0.01 80);
  --sidebar-ring: oklch(0.55 0.14 85);
}
```

- [ ] **Step 2: Replace `.dark` dark mode colors**

Replace lines 158-194 with:

```css
.dark {
  --background: oklch(0.14 0.01 260);
  --foreground: oklch(0.93 0.01 80);
  --card: oklch(0.18 0.01 260);
  --card-foreground: oklch(0.93 0.01 80);
  --popover: oklch(0.18 0.01 260);
  --popover-foreground: oklch(0.93 0.01 80);
  /* Dark mode: brighter gold for contrast */
  --primary: oklch(0.78 0.14 90);
  --primary-foreground: oklch(0.14 0.01 260);
  --secondary: oklch(0.22 0.01 260);
  --secondary-foreground: oklch(0.93 0.01 80);
  --muted: oklch(0.22 0.015 260);
  --muted-foreground: oklch(0.7 0.015 250);
  /* Dark accent: gold */
  --accent: oklch(0.65 0.14 88);
  --accent-foreground: oklch(0.14 0.01 260);
  --destructive: oklch(0.704 0.191 22.216);
  --destructive-foreground: oklch(0.14 0.01 260);
  --border: oklch(1 0 0 / 14%);
  --input: oklch(1 0 0 / 18%);
  --ring: oklch(0.78 0.14 90);
  /* Dark chart colors: gold spectrum */
  --chart-1: oklch(0.78 0.14 90);   /* Bright gold */
  --chart-2: oklch(0.72 0.14 88);   /* Gold */
  --chart-3: oklch(0.85 0.1 85);    /* Light gold */
  --chart-4: oklch(0.65 0.12 90);   /* Medium gold */
  --chart-5: oklch(0.55 0.14 85);   /* Dark gold */
  --sidebar: oklch(0.16 0.01 260);
  --sidebar-foreground: oklch(0.93 0.01 80);
  --sidebar-primary: oklch(0.78 0.14 90);
  --sidebar-primary-foreground: oklch(0.14 0.01 260);
  --sidebar-accent: oklch(0.22 0.015 260);
  --sidebar-accent-foreground: oklch(0.93 0.01 80);
  --sidebar-border: oklch(1 0 0 / 14%);
  --sidebar-ring: oklch(0.78 0.14 90);
}
```

- [ ] **Step 3: Replace gradient utilities**

Replace lines 218-273 (all `.bg-horizon-*` and `.text-horizon-gradient` classes) with:

```css
/* Start HN gradient utilities */
.bg-starthn-gradient {
  background: linear-gradient(135deg,
    oklch(0.78 0.14 90) 0%,
    oklch(0.55 0.14 85) 100%
  );
}

.bg-starthn-warm {
  background: linear-gradient(135deg,
    oklch(0.97 0.02 85) 0%,
    oklch(0.95 0.03 82) 50%,
    oklch(0.93 0.04 78) 100%
  );
}

.dark .bg-starthn-warm {
  background: linear-gradient(135deg,
    oklch(0.17 0.02 75) 0%,
    oklch(0.16 0.025 70) 50%,
    oklch(0.18 0.02 78) 100%
  );
}

.bg-starthn-accent {
  background: linear-gradient(135deg,
    oklch(0.99 0.005 0) 0%,
    oklch(0.97 0.02 85) 40%,
    oklch(0.96 0.015 80) 100%
  );
}

.text-starthn-gradient {
  background: linear-gradient(135deg,
    oklch(0.78 0.14 90) 0%,
    oklch(0.55 0.14 85) 100%
  );
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}
```

- [ ] **Step 4: Update comment on line 204**

Replace `/* Better focus visibility with Horizon branding */` with `/* Better focus visibility with Start HN branding */`.

- [ ] **Step 5: Run dev server and visually verify color changes**

Run: `npm run dev`

Open in browser, toggle dark mode. Verify gold palette renders on buttons, links, and focus rings. No orange or purple should remain.

- [ ] **Step 6: Commit**

```bash
git add src/styles.css
git commit -m "feat: replace Horizon orange/purple theme with Start HN gold/amber palette"
```

---

### Task 2: Add Google Fonts (Plus Jakarta Sans + Public Sans)

**Files:**
- Modify: `src/styles.css:11-15` (font-family declarations)
- Modify: `src/routes/__root.tsx` (add font preconnect/stylesheet links in head)

- [ ] **Step 1: Add Google Fonts links to root head**

In `src/routes/__root.tsx`, find the `links` array inside the `head()` function (around line 242). Add these entries at the beginning of the array:

```typescript
{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
{ rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Public+Sans:wght@400;500;600&display=swap' },
```

- [ ] **Step 2: Update body font-family in styles.css**

Replace lines 11-15 in `src/styles.css`:

```css
body {
  @apply m-0;
  font-family: "Public Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
    "Helvetica Neue", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

- [ ] **Step 3: Add heading font-family rule**

Add immediately after the `body` block (after line 18):

```css
h1, h2, h3, h4, h5, h6, .font-heading {
  font-family: "Plus Jakarta Sans", "Public Sans", sans-serif;
}
```

- [ ] **Step 4: Verify fonts load in dev server**

Run: `npm run dev`

Open browser DevTools → Network tab → filter "fonts". Confirm Plus Jakarta Sans and Public Sans woff2 files load. Headings should appear rounded/geometric, body text clean sans-serif.

- [ ] **Step 5: Commit**

```bash
git add src/styles.css src/routes/__root.tsx
git commit -m "feat: add Plus Jakarta Sans + Public Sans font pairing"
```

---

### Task 3: Download and Swap Logo

**Files:**
- Create: `public/logo-64.webp` (overwrite)
- Create: `public/logo-128.webp` (overwrite)
- Create: `public/logo-256.webp` (overwrite)

- [ ] **Step 1: Download the Start HN logo from the WordPress site**

```bash
curl -L "https://starthn.ba/wp-content/uploads/2024/04/IMG_7508__1_-removebg-preview.png" -o /c/Development/starthn/public/starthn-logo-original.png
```

- [ ] **Step 2: Generate sized WebP versions**

Using sharp (already in node_modules via Vite):

```bash
npx tsx -e "
const sharp = require('sharp');
const src = 'public/starthn-logo-original.png';
sharp(src).resize(64, 64, {fit:'contain', background:{r:0,g:0,b:0,alpha:0}}).webp({quality:90}).toFile('public/logo-64.webp');
sharp(src).resize(128, 128, {fit:'contain', background:{r:0,g:0,b:0,alpha:0}}).webp({quality:90}).toFile('public/logo-128.webp');
sharp(src).resize(256, 256, {fit:'contain', background:{r:0,g:0,b:0,alpha:0}}).webp({quality:90}).toFile('public/logo-256.webp');
"
```

If sharp isn't available as CJS, use an alternative approach (e.g. install `sharp` or use an online converter). The key output: three WebP files at 64, 128, and 256px square.

- [ ] **Step 3: Generate favicon and PWA icons from logo**

```bash
npx tsx -e "
const sharp = require('sharp');
const src = 'public/starthn-logo-original.png';
sharp(src).resize(32, 32, {fit:'contain', background:{r:0,g:0,b:0,alpha:0}}).png().toFile('public/favicon-32.png');
sharp(src).resize(180, 180, {fit:'contain', background:{r:0,g:0,b:0,alpha:0}}).png().toFile('public/apple-touch-icon.png');
sharp(src).resize(192, 192, {fit:'contain', background:{r:0,g:0,b:0,alpha:0}}).png().toFile('public/icon-192.png');
sharp(src).resize(512, 512, {fit:'contain', background:{r:0,g:0,b:0,alpha:0}}).png().toFile('public/icon-512.png');
"
```

- [ ] **Step 4: Verify logos appear in dev server**

Run: `npm run dev`

Check navbar, footer, login page. The Start HN logo should appear everywhere the old Horizon logo was.

- [ ] **Step 5: Commit**

```bash
git add public/starthn-logo-original.png public/logo-64.webp public/logo-128.webp public/logo-256.webp public/favicon-32.png public/apple-touch-icon.png public/icon-192.png public/icon-512.png
git commit -m "feat: replace Horizon logo with Start HN logo and regenerate all icon sizes"
```

---

### Task 4: Update manifest.json

**Files:**
- Modify: `public/manifest.json`

- [ ] **Step 1: Replace manifest.json content**

Replace the entire file with:

```json
{
  "short_name": "Start HN",
  "name": "Start HN — Računovodstvena agencija",
  "description": "Računovodstvene usluge, porezno savjetovanje i finansijski menadžment za mikro, mala i srednja privredna društva.",
  "icons": [
    {
      "src": "icon-192.png",
      "type": "image/png",
      "sizes": "192x192"
    },
    {
      "src": "icon-512.png",
      "type": "image/png",
      "sizes": "512x512"
    }
  ],
  "start_url": "/en-US",
  "display": "standalone",
  "theme_color": "#B8860B",
  "background_color": "#0F1115",
  "lang": "en-US",
  "categories": ["business", "finance"]
}
```

- [ ] **Step 2: Commit**

```bash
git add public/manifest.json
git commit -m "feat: update manifest.json with Start HN branding and gold theme color"
```

---

### Task 5: Update Root Route Meta Tags and Loading State

**Files:**
- Modify: `src/routes/__root.tsx`

- [ ] **Step 1: Update the loading state message**

Find line ~152: `message="Loading Horizon Tech..."` and replace with:

```typescript
message="Loading Start HN..."
```

- [ ] **Step 2: Update the theme storage key**

Find line ~143: `storageKey="horizon-tech-theme"` and replace with:

```typescript
storageKey="starthn-theme"
```

- [ ] **Step 3: Update meta tags in head()**

Find the `meta` array in the `head()` function. Replace all Horizon references:

- `theme-color` content: `'#FF6B35'` → `'#B8860B'`
- Description content: replace the entire enterprise software string with `'Računovodstvene usluge, porezno savjetovanje i finansijski menadžment. Start HN — vaš partner za rast.'`
- Author: `'Horizon Tech d.o.o.'` → `'Start HN'`
- `og:site_name`: `'Horizon Tech'` → `'Start HN'`
- OG title: `'Horizon Tech — Engineering Systems That Scale'` → `'Start HN — Računovodstvena agencija'`
- Twitter title: `'Start HN'`
- Twitter description: `'Računovodstvene usluge, porezno savjetovanje i finansijski menadžment.'`

- [ ] **Step 4: Verify meta tags in browser**

Run: `npm run dev`

View page source or use DevTools Elements tab. Check `<meta>` tags show Start HN branding with no Horizon references.

- [ ] **Step 5: Commit**

```bash
git add src/routes/__root.tsx
git commit -m "feat: update root route meta tags, loading state, and theme key to Start HN"
```

---

### Task 6: Update SEO Defaults

**Files:**
- Modify: `src/lib/seo.ts:58`

- [ ] **Step 1: Replace DEFAULT_SITE_NAME**

Find line 58: `const DEFAULT_SITE_NAME = 'Horizon Tech'` and replace with:

```typescript
const DEFAULT_SITE_NAME = 'Start HN'
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/seo.ts
git commit -m "feat: update SEO default site name to Start HN"
```

---

### Task 7: Update All Component Branding Strings

**Files:**
- Modify: `src/components/Navbar.tsx:82`
- Modify: `src/components/Footer.tsx:114`
- Modify: `src/components/admin/AdminNavbar.tsx:109`
- Modify: `src/components/FirstTimeSetup.tsx:25`
- Modify: `src/components/MobileHeader.tsx:25`
- Modify: `src/components/login-form.tsx:139-140`
- Modify: `src/components/register-form.tsx:115-116`
- Modify: `src/components/chat/ChatWidget.tsx:116`

- [ ] **Step 1: Update Navbar company name**

In `src/components/Navbar.tsx` find line ~82: `const companyName = 'Horizon Tech'` and replace with:

```typescript
const companyName = 'Start HN'
```

- [ ] **Step 2: Update all alt="Horizon Tech" attributes**

In each of these files, replace `alt="Horizon Tech"` with `alt="Start HN"`:

- `src/components/Footer.tsx:114`
- `src/components/admin/AdminNavbar.tsx:109`
- `src/components/FirstTimeSetup.tsx:25`
- `src/components/MobileHeader.tsx:25`
- `src/components/login-form.tsx:139-140`
- `src/components/register-form.tsx:115-116`

- [ ] **Step 3: Update ChatWidget branding**

In `src/components/chat/ChatWidget.tsx` find line ~116: `Chat with Horizon` and replace with:

```tsx
Chat with Start HN
```

Also check `src/components/landing/ChatSection.tsx:67` for `"Chat with Horizon"` and replace with `"Chat with Start HN"`.

- [ ] **Step 4: Search for any remaining "Horizon" strings in components**

Run: `grep -rn "Horizon" src/components/ --include="*.tsx" --include="*.ts"`

Fix any remaining occurrences. Key ones to check:
- `BenefitsSection.tsx:63` — "Why Work at Horizon Tech?" → "Why Work at Start HN?"
- `CTASection.tsx:27` — "Partner with Horizon Tech" → "Partner with Start HN"
- `CompanyStorySection.tsx:10` — replace company origin text
- `TeamSection.tsx` — team member bios referencing Horizon
- `TestimonialsSection.tsx` — testimonial quotes (these will be fully replaced in Phase 2 content, but update "Horizon" → "Start HN" for now)

- [ ] **Step 5: Verify in dev server**

Run: `npm run dev`

Navigate to: home page, login, footer, admin. Verify "Start HN" appears everywhere. No "Horizon" should be visible anywhere in the UI.

- [ ] **Step 6: Commit**

```bash
git add src/components/
git commit -m "feat: replace all Horizon branding strings with Start HN in components"
```

---

### Task 8: Update Remaining Route-Level Branding

**Files:**
- Modify: `src/routes/{-$locale}/about.tsx`
- Modify: `src/routes/{-$locale}/blog.index.tsx`
- Modify: `src/routes/{-$locale}/blog.$slug.tsx`
- Modify: `src/routes/{-$locale}/careers.tsx`
- Modify: `src/routes/{-$locale}/case-studies.$id.tsx`
- Modify: `src/hooks/useI18nMeta.ts`

- [ ] **Step 1: Replace all "Horizon Tech" in route head() functions**

Search all route files for hardcoded "Horizon Tech" in `head()` / `meta` / `title` strings:

```bash
grep -rn "Horizon" src/routes/ --include="*.tsx" --include="*.ts"
grep -rn "Horizon" src/hooks/ --include="*.tsx" --include="*.ts"
```

Replace every occurrence of `Horizon Tech` with `Start HN`:

- `about.tsx`: `'About — Horizon Tech'` → `'About — Start HN'`
- `blog.index.tsx`: `'Blog — Horizon Tech'` → `'Blog — Start HN'`
- `blog.$slug.tsx`: `'Horizon Tech Blog'` → `'Start HN Blog'`
- `careers.tsx`: `'Careers — Horizon Tech'` → `'Careers — Start HN'`
- `case-studies.$id.tsx`: All `'Horizon Tech'` → `'Start HN'`
- `useI18nMeta.ts:192`: `'Horizon Tech Blog'` → `'Start HN Blog'`
- `useI18nMeta.ts:221`: `'Horizon Tech Case Study'` → `'Start HN'`

- [ ] **Step 2: Verify no Horizon references remain in src/**

Run: `grep -rn "Horizon" src/ --include="*.tsx" --include="*.ts"`

The output should be empty. If any remain, fix them.

- [ ] **Step 3: Commit**

```bash
git add src/routes/ src/hooks/
git commit -m "feat: replace Horizon Tech with Start HN in all route meta tags and hooks"
```

---

### Task 9: Update Gradient Class Usage Across Codebase

**Files:**
- All files referencing `bg-horizon-*` or `text-horizon-gradient` CSS classes

- [ ] **Step 1: Find all usages of old gradient classes**

```bash
grep -rn "horizon-gradient\|horizon-sunrise\|horizon-accent\|horizon-warm\|text-horizon" src/ --include="*.tsx" --include="*.ts"
```

- [ ] **Step 2: Rename each occurrence**

Replace class names:
- `bg-horizon-gradient` → `bg-starthn-gradient`
- `bg-horizon-sunrise` → `bg-starthn-warm` (sunrise concept doesn't apply)
- `bg-horizon-accent` → `bg-starthn-accent`
- `bg-horizon-warm` → `bg-starthn-warm`
- `text-horizon-gradient` → `text-starthn-gradient`

- [ ] **Step 3: Verify no old class names remain**

```bash
grep -rn "horizon-gradient\|horizon-sunrise\|horizon-accent\|horizon-warm\|text-horizon" src/ --include="*.tsx" --include="*.ts"
```

Should return empty.

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "feat: rename gradient utility classes from horizon-* to starthn-*"
```

---

### Task 10: Final Verification and Push

- [ ] **Step 1: Full grep for any remaining "Horizon" or "horizon" in source**

```bash
grep -rni "horizon" src/ --include="*.tsx" --include="*.ts" --include="*.css"
grep -rni "horizon" public/manifest.json
```

Fix any remaining references.

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Fix any type errors.

- [ ] **Step 3: Run dev server and full visual review**

Run: `npm run dev`

Check:
- Home page: gold palette, correct fonts, Start HN logo
- Dark mode toggle: dark gold theme
- Login page: Start HN logo, no Horizon text
- Footer: Start HN logo, correct contact info
- Blog: page titles say "Start HN"
- View page source: meta tags all say Start HN, theme-color is #B8860B

- [ ] **Step 4: Push to GitHub**

```bash
git push origin master
```

- [ ] **Step 5: Deploy to Cloudflare Workers (optional)**

```bash
npm run build && npx wrangler deploy
```

Verify on the Workers URL that the gold theme renders correctly.
