/**
 * Download all translation files from Azure Blob Storage to public/locales/
 *
 * Usage: npx tsx scripts/download-translations.ts
 */

import fs from 'fs'
import path from 'path'

const BLOB_BASE = 'https://htstorageprod.blob.core.windows.net/locales'
const NAMESPACES = ['common', 'seo', 'landing', 'auth', 'blog', 'pages', 'services', 'innovation-lab']
const OUTPUT_DIR = path.resolve(import.meta.dirname, '..', 'public', 'locales')

// Read locale codes from languages.ts
const langFile = fs.readFileSync(path.resolve(import.meta.dirname, '..', 'src', 'lib', 'languages.ts'), 'utf8')
const LOCALES = [...langFile.matchAll(/code:\s*'([^']+)'/g)].map(m => m[1])

async function downloadLocale(locale: string): Promise<{ ok: number; skip: number }> {
  const dir = path.join(OUTPUT_DIR, locale)
  fs.mkdirSync(dir, { recursive: true })

  let ok = 0, skip = 0

  await Promise.all(
    NAMESPACES.map(async (ns) => {
      const url = `${BLOB_BASE}/${locale}/${ns}.json`
      try {
        const res = await fetch(url)
        if (!res.ok) { skip++; return }
        const json = await res.text()
        // Validate it's actual JSON, not an error page
        JSON.parse(json)
        fs.writeFileSync(path.join(dir, `${ns}.json`), json)
        ok++
      } catch {
        skip++
      }
    }),
  )

  return { ok, skip }
}

async function main() {
  console.log(`Downloading ${LOCALES.length} locales × ${NAMESPACES.length} namespaces...\n`)

  let totalOk = 0, totalSkip = 0, localesWithData = 0

  // Process in batches of 20 to avoid overwhelming the server
  for (let i = 0; i < LOCALES.length; i += 20) {
    const batch = LOCALES.slice(i, i + 20)
    const results = await Promise.all(batch.map(async (locale) => {
      const { ok, skip } = await downloadLocale(locale)
      if (ok > 0) {
        localesWithData++
        process.stdout.write(`  ✓ ${locale} (${ok}/${NAMESPACES.length})\n`)
      }
      return { ok, skip }
    }))

    for (const r of results) {
      totalOk += r.ok
      totalSkip += r.skip
    }
  }

  // Clean up empty locale directories
  for (const locale of LOCALES) {
    const dir = path.join(OUTPUT_DIR, locale)
    if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
      fs.rmdirSync(dir)
    }
  }

  console.log(`\nDone: ${totalOk} files downloaded, ${totalSkip} skipped`)
  console.log(`${localesWithData} locales with translations out of ${LOCALES.length} total`)
}

main().catch(console.error)
