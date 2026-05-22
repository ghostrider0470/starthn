#!/usr/bin/env node
/**
 * Lighthouse audit runner — outputs structured JSON for Claude to analyze.
 *
 * Usage:
 *   node audit.js <url> [--desktop] [--mobile] [--categories=perf,a11y,bp,seo]
 *   node audit.js <url1> <url2> ...          # audit multiple URLs
 *   node audit.js --sitemap <sitemap-url>    # audit all URLs in a sitemap
 *
 * Output: JSON with scores, metrics, and failing audits for each URL.
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const CATEGORY_MAP = {
  perf: 'performance',
  performance: 'performance',
  a11y: 'accessibility',
  accessibility: 'accessibility',
  bp: 'best-practices',
  'best-practices': 'best-practices',
  seo: 'seo',
}

function parseArgs(argv) {
  const args = argv.slice(2)
  const urls = []
  let preset = 'mobile'
  let categories = ['performance', 'accessibility', 'best-practices', 'seo']
  let sitemapUrl = null

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--desktop') preset = 'desktop'
    else if (args[i] === '--mobile') preset = 'mobile'
    else if (args[i].startsWith('--categories=')) {
      categories = args[i]
        .split('=')[1]
        .split(',')
        .map((c) => CATEGORY_MAP[c.trim()] || c.trim())
    } else if (args[i] === '--sitemap') {
      sitemapUrl = args[++i]
    } else if (args[i].startsWith('http')) {
      urls.push(args[i])
    }
  }

  return { urls, preset, categories, sitemapUrl }
}

function runLighthouse(url, preset, categories) {
  const catFlags = categories.map((c) => `--only-categories=${c}`).join(' ')
  const presetFlag = preset === 'desktop' ? '--preset=desktop' : ''
  const tmpFile = path.join(
    process.env.TEMP || '/tmp',
    `lh-${Date.now()}.json`,
  )

  try {
    execSync(
      `npx lighthouse "${url}" --output=json --output-path="${tmpFile}" --chrome-flags="--headless=new --no-sandbox" ${catFlags} ${presetFlag} 2>/dev/null`,
      { stdio: 'pipe', timeout: 120000 },
    )
    const report = JSON.parse(fs.readFileSync(tmpFile, 'utf-8'))
    fs.unlinkSync(tmpFile)
    return report
  } catch (e) {
    // Report may still have been written
    if (fs.existsSync(tmpFile)) {
      try {
        const report = JSON.parse(fs.readFileSync(tmpFile, 'utf-8'))
        fs.unlinkSync(tmpFile)
        return report
      } catch {}
    }
    return null
  }
}

function extractResults(report) {
  if (!report) return null

  const categories = {}
  for (const [key, cat] of Object.entries(report.categories || {})) {
    categories[key] = Math.round(cat.score * 100)
  }

  const m = report.audits?.metrics?.details?.items?.[0] || {}
  const metrics = {
    FCP: m.firstContentfulPaint ? Math.round(m.firstContentfulPaint) + 'ms' : null,
    LCP: m.largestContentfulPaint ? Math.round(m.largestContentfulPaint) + 'ms' : null,
    TBT: m.totalBlockingTime != null ? Math.round(m.totalBlockingTime) + 'ms' : null,
    CLS: m.cumulativeLayoutShift != null ? m.cumulativeLayoutShift.toFixed(3) : null,
    SI: m.speedIndex ? Math.round(m.speedIndex) + 'ms' : null,
  }

  const failing = []
  for (const cat of Object.values(report.categories || {})) {
    for (const ref of cat.auditRefs || []) {
      const audit = report.audits?.[ref.id]
      if (audit && audit.score !== null && audit.score < 1) {
        const items = (audit.details?.items || []).slice(0, 3).map((item) => {
          return (
            item.node?.snippet?.substring(0, 150) ||
            item.node?.explanation?.substring(0, 150) ||
            (typeof item.description === 'string' ? item.description.substring(0, 150) : null) ||
            (typeof item.value === 'string' ? item.value.substring(0, 150) : null) ||
            (typeof item.url === 'string' ? item.url.split('/').pop()?.substring(0, 80) : null) ||
            null
          )
        }).filter(Boolean)

        failing.push({
          category: cat.title,
          score: Math.round(audit.score * 100),
          title: audit.title,
          displayValue: audit.displayValue || null,
          items: items.length > 0 ? items : undefined,
        })
      }
    }
  }

  failing.sort((a, b) => a.score - b.score)

  return { categories, metrics, failing }
}

async function main() {
  const { urls, preset, categories, sitemapUrl } = parseArgs(process.argv)
  let targetUrls = urls

  if (sitemapUrl) {
    try {
      const xml = execSync(`curl -s "${sitemapUrl}"`, { encoding: 'utf-8' })
      const matches = xml.match(/<loc>(.*?)<\/loc>/g) || []
      targetUrls = matches.map((m) => m.replace(/<\/?loc>/g, ''))
    } catch (e) {
      console.error(JSON.stringify({ error: 'Failed to fetch sitemap: ' + e.message }))
      process.exit(1)
    }
  }

  if (targetUrls.length === 0) {
    console.error(JSON.stringify({
      error: 'No URLs provided',
      usage: 'node audit.js <url> [--desktop] [--mobile] [--categories=perf,a11y,bp,seo]',
    }))
    process.exit(1)
  }

  const results = {}
  for (const url of targetUrls) {
    process.stderr.write(`Auditing ${url} (${preset})...\n`)
    const report = runLighthouse(url, preset, categories)
    results[url] = extractResults(report)
  }

  console.log(JSON.stringify(results, null, 2))
}

main()
