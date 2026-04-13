/**
 * Migrate blog post translations from MongoDB to D1.
 *
 * The original migration script migrated posts but skipped the `translations`
 * subdocument. This script fills in the `blog_post_translations` table.
 *
 * MongoDB stores translations keyed by short translator codes (e.g. "bs", "de").
 * D1 stores them by full locale codes (e.g. "bs-BA", "de-DE") matching the URL
 * routes. We use the LANGUAGE_MAP to convert.
 *
 * Usage:
 *   npx tsx scripts/migrate-translations-to-d1.ts           # generate SQL
 *   npx tsx scripts/migrate-translations-to-d1.ts --exec    # execute via wrangler
 */
import { MongoClient, ObjectId } from 'mongodb'
import { writeFileSync } from 'fs'
import { execSync } from 'child_process'

// ─── Locale mapping (translatorCode → full code used in routes) ───────────
// Extracted from src/lib/languages.ts LANGUAGES array
const TRANSLATOR_TO_LOCALE: Record<string, string> = {
  af: 'af-ZA', am: 'am-ET', ar: 'ar-SA', as: 'as-IN', az: 'az-AZ',
  ba: 'ba-RU', be: 'be-BY', bg: 'bg-BG', bho: 'bho-IN', bn: 'bn-BD',
  bo: 'bo-CN', brx: 'brx-IN', bs: 'bs-BA', ca: 'ca-ES', cs: 'cs-CZ',
  cy: 'cy-GB', da: 'da-DK', de: 'de-DE', doi: 'doi-IN', dsb: 'dsb-DE',
  dv: 'dv-MV', el: 'el-GR', en: 'en-US', es: 'es-ES', et: 'et-EE',
  eu: 'eu-ES', fa: 'fa-IR', fi: 'fi-FI', fil: 'fil-PH', fj: 'fj-FJ',
  fo: 'fo-FO', fr: 'fr-FR', 'fr-CA': 'fr-CA', ga: 'ga-IE', gl: 'gl-ES',
  gom: 'gom-IN', gu: 'gu-IN', ha: 'ha-NG', he: 'he-IL', hi: 'hi-IN',
  hne: 'hne-IN', hr: 'hr-HR', hsb: 'hsb-DE', ht: 'ht-HT', hu: 'hu-HU',
  hy: 'hy-AM', id: 'id-ID', ig: 'ig-NG', ikt: 'ikt-CA', is: 'is-IS',
  it: 'it-IT', iu: 'iu-CA', 'iu-Latn': 'iu-Latn-CA', ja: 'ja-JP',
  ka: 'ka-GE', kk: 'kk-KZ', km: 'km-KH', kmr: 'kmr-TR', kn: 'kn-IN',
  ko: 'ko-KR', ks: 'ks-IN', ku: 'ku-IQ', ky: 'ky-KG', lb: 'lb-LU',
  ln: 'ln-CD', lo: 'lo-LA', lt: 'lt-LT', lug: 'lug-UG', lv: 'lv-LV',
  lzh: 'lzh-CN', mai: 'mai-IN', mg: 'mg-MG', mi: 'mi-NZ', mk: 'mk-MK',
  ml: 'ml-IN', 'mn-Cyrl': 'mn-Cyrl-MN', 'mn-Mong': 'mn-Mong-MN',
  mni: 'mni-IN', mr: 'mr-IN', ms: 'ms-MY', mt: 'mt-MT', mww: 'mww-CN',
  my: 'my-MM', nb: 'nb-NO', ne: 'ne-NP', nl: 'nl-NL', nso: 'nso-ZA',
  nya: 'nya-MW', or: 'or-IN', otq: 'otq-MX', pa: 'pa-IN', pl: 'pl-PL',
  prs: 'prs-AF', ps: 'ps-AF', pt: 'pt-BR', 'pt-PT': 'pt-PT', ro: 'ro-RO',
  ru: 'ru-RU', run: 'run-BI', rw: 'rw-RW', sd: 'sd-PK', si: 'si-LK',
  sk: 'sk-SK', sl: 'sl-SI', sm: 'sm-WS', sn: 'sn-ZW', so: 'so-SO',
  sq: 'sq-AL', 'sr-Cyrl': 'sr-Cyrl-RS', 'sr-Latn': 'sr-Latn-RS',
  st: 'st-ZA', sv: 'sv-SE', sw: 'sw-KE', ta: 'ta-IN', te: 'te-IN',
  th: 'th-TH', ti: 'ti-ET', tk: 'tk-TM', 'tlh-Latn': 'tlh-Latn',
  'tlh-Piqd': 'tlh-Piqd', tn: 'tn-ZA', to: 'to-TO', tr: 'tr-TR',
  tt: 'tt-RU', ty: 'ty-PF', ug: 'ug-CN', uk: 'uk-UA', ur: 'ur-PK',
  uz: 'uz-UZ', vi: 'vi-VN', xh: 'xh-ZA', yo: 'yo-NG', yua: 'yua-MX',
  yue: 'yue-HK', 'zh-Hans': 'zh-Hans-CN', 'zh-Hant': 'zh-Hant-TW',
  zu: 'zu-ZA',
}

const MONGO_URI = process.env.MONGODB_CONNECTION_STRING || 'mongodb://horizonAdmin:Razor1993*@fc-dde88fe2ff42-000.mongocluster.cosmos.azure.com:10260/?tls=true&retrywrites=false&directConnection=true'
const DB_NAME = process.env.MONGODB_DATABASE_NAME || 'horizon'
const OUTPUT = 'scripts/translations-migration.sql'
const EXEC = process.argv.includes('--exec')

function esc(val: any): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return String(val)
  if (typeof val === 'boolean') return val ? '1' : '0'
  return `'${String(val).replace(/'/g, "''")}'`
}

function toId(objectId: any): string {
  if (!objectId) return crypto.randomUUID().replace(/-/g, '')
  return objectId instanceof ObjectId ? objectId.toHexString() : String(objectId).padStart(24, '0')
}

async function main() {
  console.log('Connecting to MongoDB...')
  const client = new MongoClient(MONGO_URI)
  await client.connect()
  const db = client.db(DB_NAME)

  const posts = await db.collection('blogPosts').find().toArray()
  const lines: string[] = []
  let totalTranslations = 0

  for (const p of posts) {
    const postId = toId(p._id)
    if (!p.translations || typeof p.translations !== 'object') continue

    for (const [translatorCode, t] of Object.entries(p.translations as Record<string, any>)) {
      // Map short code to full locale code
      const locale = TRANSLATOR_TO_LOCALE[translatorCode] || translatorCode
      if (locale === 'en-US') continue // skip English (it's the base post)

      const id = crypto.randomUUID().replace(/-/g, '')
      lines.push(
        `INSERT OR REPLACE INTO blog_post_translations (id, post_id, locale, title, excerpt, content, is_auto_translated, translated_at) VALUES (${esc(id)}, ${esc(postId)}, ${esc(locale)}, ${esc(t.title)}, ${esc(t.excerpt)}, ${esc(t.content ? JSON.stringify(t.content) : null)}, ${t.isAutoTranslated ? 1 : 0}, ${esc(t.translatedAt?.$date ? new Date(t.translatedAt.$date).toISOString() : t.translatedAt?.toISOString?.() ?? new Date().toISOString())});`
      )
      totalTranslations++
    }
  }

  await client.close()

  console.log(`Found ${totalTranslations} translations across ${posts.length} posts`)

  if (lines.length === 0) {
    console.log('No translations to migrate.')
    return
  }

  // Write SQL file
  writeFileSync(OUTPUT, lines.join('\n'), 'utf-8')
  console.log(`Wrote ${lines.length} SQL statements to ${OUTPUT}`)

  if (EXEC) {
    console.log('Executing against D1...')
    try {
      execSync(`npx wrangler d1 execute horizon-db --file=${OUTPUT} --remote`, {
        stdio: 'inherit',
      })
      console.log('Done! Translations migrated to D1.')
    } catch (e) {
      console.error('Failed to execute SQL. Check the output file and try manually.')
      process.exit(1)
    }
  } else {
    console.log(`\nTo apply: npx wrangler d1 execute horizon-db --file=${OUTPUT} --remote`)
  }
}

main().catch(console.error)
