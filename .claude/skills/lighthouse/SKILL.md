---
name: lighthouse
description: Run local Lighthouse audits on website pages. This skill should be used when the user asks to "run lighthouse", "audit the page", "check lighthouse scores", "performance audit", "check accessibility score", "run pagespeed", or wants to evaluate web performance, accessibility, SEO, or best practices for any URL.
---

# Lighthouse Audit Skill

Run Google Lighthouse audits locally via CLI and analyze the results. Covers Performance, Accessibility, Best Practices, and SEO.

## Running an Audit

### Single URL

```bash
node .claude/skills/lighthouse/scripts/audit.js <url> [--desktop] [--mobile]
```

Default is mobile (simulated 4G + 4x CPU throttle). Use `--desktop` for desktop preset.

### Multiple URLs

```bash
node .claude/skills/lighthouse/scripts/audit.js https://example.com/page1 https://example.com/page2
```

### From Sitemap

```bash
node .claude/skills/lighthouse/scripts/audit.js --sitemap https://example.com/sitemap.xml
```

### Specific Categories

```bash
node .claude/skills/lighthouse/scripts/audit.js <url> --categories=perf,a11y,bp,seo
```

Aliases: `perf`=performance, `a11y`=accessibility, `bp`=best-practices, `seo`=seo.

## Interpreting Results

The script outputs JSON with three sections per URL:

1. **categories** — scores 0-100 for each category
2. **metrics** — FCP, LCP, TBT, CLS, SI values
3. **failing** — every audit with score < 100, sorted worst-first, with element snippets

### Score Thresholds

| | Good | Needs Work | Poor |
|--|------|-----------|------|
| Performance | 90+ | 50-89 | <50 |
| Accessibility | 100 | 90-99 | <90 |
| Best Practices | 100 | 90-99 | <90 |
| SEO | 100 | 90-99 | <90 |

### Key Metrics

| Metric | Good | Needs Work | Poor |
|--------|------|-----------|------|
| FCP | <1.8s | 1.8-3.0s | >3.0s |
| LCP | <2.5s | 2.5-4.0s | >4.0s |
| TBT | <200ms | 200-600ms | >600ms |
| CLS | <0.1 | 0.1-0.25 | >0.25 |

## Workflow

### Full Site Audit

1. Run the audit script against the sitemap or key URLs
2. Present a summary table of all pages with scores
3. Identify the worst-scoring pages and categories
4. For each failing audit, investigate the root cause in the codebase
5. Fix issues, rebuild, redeploy, and re-audit to verify

### Single Page Fix Cycle

1. Run audit on the target URL
2. Present scores, metrics, and failing audits
3. Group failures by fixability:
   - **Fixable in code** — CLS, a11y, SEO, render-blocking, unused JS/CSS
   - **Infrastructure** — TTFB, caching, CDN config
   - **Third-party** — deprecated APIs, external script issues
4. Fix what is within our control
5. Re-audit to confirm improvement

## Common Fixes Reference

### CLS (Cumulative Layout Shift)
- Add explicit `width`/`height` to images
- Use `min-h` placeholders for lazy-loaded content
- Avoid animating layout properties (`top`, `left`) — use `transform` instead
- Apply theme class before first paint via inline `<script>` in `<head>`

### LCP (Largest Contentful Paint)
- Don't lazy-load above-the-fold content
- Preload critical images with `<link rel="preload">`
- Reduce server response time (edge caching)
- Minimize render-blocking resources

### Accessibility
- Every interactive element needs an accessible name
- Color contrast ratio must meet WCAG AA (4.5:1 for text)
- Heading levels must not skip (h1→h3 without h2)
- Images need descriptive `alt` text

### SEO
- Links need descriptive text (not "Learn More" or "Click Here")
- Add `sr-only` spans for visually-hidden descriptive text
- Every page needs `<title>` and `meta description`
- Use semantic HTML (`<nav>`, `<main>`, `<article>`)

### Best Practices
- Fix console errors (CSP issues, failed loads)
- Enable source maps (`sourcemap: true` in Vite)
- Avoid deprecated APIs
- Use HTTPS for all resources

## Notes

- Mobile scores are always lower than desktop (4G throttle + 4x CPU slowdown)
- Lighthouse scores can vary ±5 between runs — run 2-3 times for reliability
- Local `wrangler dev` scores will be worse than production (no CDN, local D1)
- `--desktop` preset gives more representative scores for production edge-cached sites
