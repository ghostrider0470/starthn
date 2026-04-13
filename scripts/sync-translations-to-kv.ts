/**
 * Sync translation files from Azure Blob Storage to Cloudflare KV.
 *
 * Usage:
 *   npx tsx scripts/sync-translations-to-kv.ts [--locales en-US,bs-BA,hr-HR]
 *
 * By default, syncs only the primary locales. Use --all for everything.
 */

const BLOB_BASE = 'https://starthnstorage.blob.core.windows.net/locales'
const NAMESPACES = ['common', 'seo', 'landing', 'auth', 'blog', 'pages', 'services', 'innovation-lab']

// Primary locales to sync (add more as needed)
const PRIMARY_LOCALES = ['en-US', 'bs-BA', 'hr-HR', 'sr-Latn', 'de-DE']

async function main() {
  const args = process.argv.slice(2)
  const localesArg = args.find(a => a.startsWith('--locales='))
  const locales = localesArg
    ? localesArg.split('=')[1].split(',')
    : PRIMARY_LOCALES

  console.log(`Syncing ${locales.length} locales × ${NAMESPACES.length} namespaces to KV...\n`)

  const entries: { key: string; value: string }[] = []

  for (const locale of locales) {
    for (const ns of NAMESPACES) {
      const url = `${BLOB_BASE}/${locale}/${ns}.json`
      try {
        const res = await fetch(url)
        if (!res.ok) {
          console.log(`  SKIP ${locale}/${ns} (${res.status})`)
          continue
        }
        const json = await res.text()
        entries.push({ key: `${locale}/${ns}`, value: json })
        console.log(`  OK   ${locale}/${ns} (${json.length} bytes)`)
      } catch (err) {
        console.log(`  ERR  ${locale}/${ns}: ${err}`)
      }
    }
  }

  // Write to a JSON file for bulk upload via wrangler
  const outputPath = 'scripts/kv-translations.json'
  const fs = await import('fs')
  fs.writeFileSync(outputPath, JSON.stringify(entries, null, 2))
  console.log(`\nWrote ${entries.length} entries to ${outputPath}`)
  console.log(`\nRun: npx wrangler kv bulk put --namespace-id 7d8f6b57e30445d680cc3002f7172a60 ${outputPath}`)
}

main().catch(console.error)
