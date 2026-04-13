/**
 * scripts/migrate-cosmos-nosql.ts
 *
 * Migrates MongoDB collections to Azure Cosmos DB (NoSQL API).
 *
 * Usage:
 *   DRY RUN (default):
 *     MONGODB_CONNECTION_STRING=... COSMOS_ENDPOINT=... COSMOS_KEY=... npx tsx scripts/migrate-cosmos-nosql.ts
 *
 *   EXECUTE (writes to Cosmos):
 *     MONGODB_CONNECTION_STRING=... COSMOS_ENDPOINT=... COSMOS_KEY=... npx tsx scripts/migrate-cosmos-nosql.ts --confirm
 *
 * DO NOT run with --confirm without user approval.
 */

import { MongoClient, ObjectId } from 'mongodb'
import { CosmosClient } from '@azure/cosmos'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MONGO_URI = process.env.MONGODB_CONNECTION_STRING
const MONGO_DB_NAME = process.env.MONGODB_DATABASE_NAME || 'horizon'
const COSMOS_ENDPOINT = process.env.COSMOS_ENDPOINT
const COSMOS_KEY = process.env.COSMOS_KEY
const COSMOS_DB_NAME = process.env.COSMOS_DB_NAME || 'horizon'

const IS_CONFIRM = process.argv.includes('--confirm')
const MODE = IS_CONFIRM ? 'EXECUTE' : 'DRY RUN (no writes)'

// ---------------------------------------------------------------------------
// Collection configs
// ---------------------------------------------------------------------------

type IdStrategy =
  | { type: 'keepObjectId' }
  | { type: 'useField'; field: string }
  | { type: 'fixed'; value: string }

interface CollectionConfig {
  mongoCollection: string
  cosmosContainer: string
  partitionKey: string
  idStrategy: IdStrategy
}

const COLLECTIONS: CollectionConfig[] = [
  {
    mongoCollection: 'users',
    cosmosContainer: 'users',
    partitionKey: 'email',
    idStrategy: { type: 'keepObjectId' },
  },
  {
    mongoCollection: 'blogPosts',
    cosmosContainer: 'blogPosts',
    partitionKey: 'slug',
    idStrategy: { type: 'useField', field: 'slug' },
  },
  {
    mongoCollection: 'categories',
    cosmosContainer: 'categories',
    partitionKey: 'slug',
    idStrategy: { type: 'useField', field: 'slug' },
  },
  {
    mongoCollection: 'tags',
    cosmosContainer: 'tags',
    partitionKey: 'slug',
    idStrategy: { type: 'useField', field: 'slug' },
  },
  {
    mongoCollection: 'roles',
    cosmosContainer: 'roles',
    partitionKey: 'name',
    idStrategy: { type: 'useField', field: 'name' },
  },
  {
    mongoCollection: 'caseStudies',
    cosmosContainer: 'caseStudies',
    partitionKey: 'slug',
    idStrategy: { type: 'useField', field: 'slug' },
  },
  {
    mongoCollection: 'llmProviders',
    cosmosContainer: 'llmProviders',
    partitionKey: 'key',
    idStrategy: { type: 'useField', field: 'key' },
  },
  {
    mongoCollection: 'llmSettings',
    cosmosContainer: 'llmSettings',
    partitionKey: 'id',
    idStrategy: { type: 'fixed', value: 'settings' },
  },
  {
    mongoCollection: 'processedImages',
    cosmosContainer: 'processedImages',
    partitionKey: 'path',
    idStrategy: { type: 'useField', field: 'path' },
  },
]

// ---------------------------------------------------------------------------
// Transform helpers
// ---------------------------------------------------------------------------

function resolveId(doc: any, strategy: IdStrategy): string {
  switch (strategy.type) {
    case 'keepObjectId':
      return doc._id instanceof ObjectId ? doc._id.toHexString() : String(doc._id)
    case 'useField':
      return String(doc[strategy.field])
    case 'fixed':
      return strategy.value
  }
}

function idStrategyLabel(strategy: IdStrategy): string {
  switch (strategy.type) {
    case 'keepObjectId':
      return 'keepObjectId'
    case 'useField':
      return `useField(${strategy.field})`
    case 'fixed':
      return `fixed("${strategy.value}")`
  }
}

/** Base transform applied to every collection */
function baseTransform(doc: any, strategy: IdStrategy): any {
  const out: any = { ...doc }

  // Rename _id → id
  delete out._id
  out.id = resolveId(doc, strategy)

  // Remove Mongoose version key
  delete out.__v

  // Do NOT set _etag — Cosmos generates it
  delete out._etag

  return out
}

/** Users-specific transforms */
function transformUser(doc: any, strategy: IdStrategy): any {
  const out = baseTransform(doc, strategy)

  // passwordHash: "" → null
  if (out.passwordHash === '') out.passwordHash = null

  // firstName / lastName: "" → null
  if (out.firstName === '') out.firstName = null
  if (out.lastName === '') out.lastName = null

  // pageContent: string → [{ type, content }]; falsy → null
  if (typeof out.pageContent === 'string') {
    out.pageContent = [{ type: 'text', content: out.pageContent }]
  } else if (!out.pageContent) {
    out.pageContent = null
  }
  // if already array → keep as-is

  // pageTranslations: fix pageContent inside each entry
  if (out.pageTranslations && typeof out.pageTranslations === 'object') {
    for (const locale of Object.keys(out.pageTranslations)) {
      const entry = out.pageTranslations[locale]
      if (entry && typeof entry.pageContent === 'string') {
        entry.pageContent = [{ type: 'text', content: entry.pageContent }]
      }
    }
  }

  // socialLinks: normalise flat fields → nested object
  const hasFlatSocial =
    'socialLinkedin' in out ||
    'socialTwitter' in out ||
    'socialGithub' in out ||
    'socialWebsite' in out

  if (hasFlatSocial) {
    out.socialLinks = {
      linkedIn: out.socialLinkedin ?? null,
      twitter: out.socialTwitter ?? null,
      gitHub: out.socialGithub ?? null,
      website: out.socialWebsite ?? null,
    }
    delete out.socialLinkedin
    delete out.socialTwitter
    delete out.socialGithub
    delete out.socialWebsite
  }
  // if already nested socialLinks object → keep as-is

  return out
}

/** BlogPosts-specific transforms — strips translations from parent doc */
function transformBlogPost(doc: any, strategy: IdStrategy): { parent: any; translations: any[] } {
  const out = baseTransform(doc, strategy)

  // readTime: string → parse first integer; number → keep; unparseable → null
  if (typeof out.readTime === 'string') {
    const match = out.readTime.match(/(\d+)/)
    out.readTime = match ? parseInt(match[1], 10) : null
  } else if (typeof out.readTime !== 'number') {
    out.readTime = null
  }

  // publishedAt: string → ISO string; Date → ISO string; falsy → null
  if (out.publishedAt) {
    if (typeof out.publishedAt === 'string') {
      const d = new Date(out.publishedAt)
      out.publishedAt = isNaN(d.getTime()) ? null : d.toISOString()
    } else if (out.publishedAt instanceof Date) {
      out.publishedAt = out.publishedAt.toISOString()
    }
  } else {
    out.publishedAt = null
  }

  // content: Array<string> → map to objects; already Array<object> → keep; falsy → null
  if (Array.isArray(out.content)) {
    if (out.content.length > 0 && typeof out.content[0] === 'string') {
      out.content = out.content.map((s: string) => ({ type: 'paragraph', text: s }))
    }
    // already Array<object> → keep
  } else if (!out.content) {
    out.content = null
  }

  // Extract translations into separate docs
  const translationDocs: any[] = []
  const rawTranslations = out.translations
  if (rawTranslations && typeof rawTranslations === 'object') {
    for (const [lang, trans] of Object.entries(rawTranslations as Record<string, any>)) {
      translationDocs.push({
        id: `${out.id}:${lang}`,
        postSlug: out.id, // id = slug for blogPosts
        lang,
        title: trans.title ?? null,
        excerpt: trans.excerpt ?? null,
        content: trans.content ?? null,
        isAutoTranslated: trans.isAutoTranslated ?? true,
        translatedAt: trans.translatedAt ?? null,
      })
    }
  }
  // Remove translations from parent doc
  delete out.translations

  return { parent: out, translations: translationDocs }
}

/** Users-specific transforms — strips pageTranslations from parent doc */
function transformUserSplit(doc: any, strategy: IdStrategy): { parent: any; translations: any[] } {
  const out = transformUser(doc, strategy)

  // Extract pageTranslations into separate docs
  const translationDocs: any[] = []
  const rawPageTranslations = out.pageTranslations
  if (rawPageTranslations && typeof rawPageTranslations === 'object') {
    for (const [lang, trans] of Object.entries(rawPageTranslations as Record<string, any>)) {
      let pageContent = trans.pageContent
      if (typeof pageContent === 'string') {
        pageContent = [{ type: 'text', content: pageContent }]
      }
      translationDocs.push({
        id: `${out.id}:${lang}`,
        userId: out.id,
        lang,
        bio: trans.bio ?? null,
        pageContent: pageContent ?? null,
        isAutoTranslated: trans.isAutoTranslated ?? true,
        translatedAt: trans.translatedAt ?? new Date().toISOString(),
      })
    }
  }
  // Remove pageTranslations from parent doc
  delete out.pageTranslations

  return { parent: out, translations: translationDocs }
}

/** Dispatch to the right transform function — returns { parent, translations? } for split collections */
function transformDoc(doc: any, config: CollectionConfig): any {
  switch (config.mongoCollection) {
    case 'users':
      return transformUserSplit(doc, config.idStrategy)
    case 'blogPosts':
      return transformBlogPost(doc, config.idStrategy)
    default:
      return { parent: baseTransform(doc, config.idStrategy), translations: [] }
  }
}

// ---------------------------------------------------------------------------
// Cosmos write helpers
// ---------------------------------------------------------------------------

async function upsertBatch(container: any, docs: any[]): Promise<void> {
  const operations = docs.map(doc => ({
    operationType: 'Upsert' as const,
    resourceBody: doc,
  }))

  for (let i = 0; i < operations.length; i += 100) {
    const batch = operations.slice(i, i + 100)
    await container.items.bulk(batch)
  }
}

// ---------------------------------------------------------------------------
// Pretty-print helpers
// ---------------------------------------------------------------------------

function truncateSample(doc: any, maxFields = 8): any {
  const keys = Object.keys(doc).slice(0, maxFields)
  const out: any = {}
  for (const k of keys) {
    const v = doc[k]
    if (typeof v === 'string' && v.length > 80) {
      out[k] = v.slice(0, 80) + '…'
    } else if (Array.isArray(v)) {
      out[k] = `[Array(${v.length})]`
    } else if (v && typeof v === 'object' && !(v instanceof Date)) {
      out[k] = '{…}'
    } else {
      out[k] = v
    }
  }
  if (Object.keys(doc).length > maxFields) {
    out['…'] = `(+${Object.keys(doc).length - maxFields} more fields)`
  }
  return out
}

function pad(s: string | number, n: number): string {
  return String(s).padEnd(n)
}

// ---------------------------------------------------------------------------
// Summary row type
// ---------------------------------------------------------------------------

interface SummaryRow {
  collection: string
  source: number
  destination: number | '—'
  status: 'DRY RUN' | 'OK' | 'MISMATCH' | 'ERROR'
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== MongoDB → Cosmos NoSQL Migration ===')
  console.log(`Mode: ${MODE}`)
  console.log()

  // Validate env vars
  if (!MONGO_URI) {
    console.error('ERROR: MONGODB_CONNECTION_STRING env var is required')
    process.exit(1)
  }
  if (!COSMOS_ENDPOINT || !COSMOS_KEY) {
    console.error('ERROR: COSMOS_ENDPOINT and COSMOS_KEY env vars are required')
    process.exit(1)
  }

  // Connect to MongoDB
  let mongoClient: MongoClient
  try {
    mongoClient = new MongoClient(MONGO_URI)
    await mongoClient.connect()
    console.log(`Connected to MongoDB (db: ${MONGO_DB_NAME})`)
  } catch (err) {
    console.error('ERROR: Failed to connect to MongoDB:', err)
    process.exit(1)
  }

  // Connect to Cosmos DB
  let cosmosClient: CosmosClient
  let cosmosDb: any
  try {
    cosmosClient = new CosmosClient({ endpoint: COSMOS_ENDPOINT, key: COSMOS_KEY })
    cosmosDb = cosmosClient.database(COSMOS_DB_NAME)
    // Light connectivity check — list containers
    await cosmosDb.containers.readAll().fetchAll()
    console.log(`Connected to Cosmos DB (db: ${COSMOS_DB_NAME})`)
  } catch (err) {
    console.error('ERROR: Failed to connect to Cosmos DB:', err)
    await mongoClient.close()
    process.exit(1)
  }

  console.log()

  const db = mongoClient.db(MONGO_DB_NAME)
  const summary: SummaryRow[] = []

  for (const config of COLLECTIONS) {
    console.log(`Collection: ${config.mongoCollection}`)

    // Count source docs
    let sourceCount: number
    try {
      sourceCount = await db.collection(config.mongoCollection).countDocuments()
    } catch (err) {
      console.error(`  ERROR counting source: ${err}`)
      summary.push({ collection: config.mongoCollection, source: 0, destination: '—', status: 'ERROR' })
      continue
    }

    console.log(`  Source count:  ${sourceCount}`)
    console.log(`  Partition key: ${config.partitionKey}`)
    console.log(`  ID strategy:   ${idStrategyLabel(config.idStrategy)}`)

    if (!IS_CONFIRM) {
      // DRY RUN: show sample
      if (sourceCount > 0) {
        const firstDoc = await db.collection(config.mongoCollection).findOne({})
        if (firstDoc) {
          let transformed: any
          try {
            const result = transformDoc(firstDoc, config)
            transformed = result.parent ?? result
            if (result.translations?.length > 0) {
              console.log(`  Translations to split out: ${result.translations.length} (first doc)`)
              console.log(`  Sample translation[0]: ${JSON.stringify(truncateSample(result.translations[0]), null, 2).replace(/\n/g, '\n    ')}`)
            }
          } catch (err) {
            console.error(`  WARNING: Transform failed on sample doc (${firstDoc._id}): ${err}`)
            transformed = { error: String(err) }
          }
          console.log(`  Sample (first doc, transformed):`)
          console.log(`    ${JSON.stringify(truncateSample(transformed), null, 2).replace(/\n/g, '\n    ')}`)
        }
      } else {
        console.log(`  Sample: (empty collection)`)
      }

      summary.push({ collection: config.mongoCollection, source: sourceCount, destination: '—', status: 'DRY RUN' })
    } else {
      // EXECUTE: read all, transform, upsert
      const container = cosmosDb.container(config.cosmosContainer)

      // Translation containers for split collections
      const blogTranslationsContainer = config.mongoCollection === 'blogPosts'
        ? cosmosDb.container('blogPostTranslations')
        : null
      const userTranslationsContainer = config.mongoCollection === 'users'
        ? cosmosDb.container('userPageTranslations')
        : null

      let migratedCount = 0
      let translationCount = 0
      let errorCount = 0

      if (sourceCount > 0) {
        const cursor = db.collection(config.mongoCollection).find({})
        const BATCH_SIZE = 100
        let parentBatch: any[] = []
        let translationBatch: any[] = []

        for await (const doc of cursor) {
          let result: { parent: any; translations: any[] }
          try {
            result = transformDoc(doc, config)
          } catch (err) {
            console.error(`  WARNING: Transform failed on doc ${doc._id}: ${err}`)
            errorCount++
            continue
          }
          parentBatch.push(result.parent)
          if (result.translations?.length) {
            translationBatch.push(...result.translations)
          }

          if (parentBatch.length >= BATCH_SIZE) {
            try {
              await upsertBatch(container, parentBatch)
              migratedCount += parentBatch.length
            } catch (err) {
              console.error(`  ERROR: Cosmos upsert failed for parent batch: ${err}`)
              errorCount += parentBatch.length
            }
            parentBatch = []
          }

          // Flush translations in batches (they may pile up faster)
          const translationContainer = blogTranslationsContainer ?? userTranslationsContainer
          if (translationContainer && translationBatch.length >= BATCH_SIZE) {
            try {
              await upsertBatch(translationContainer, translationBatch)
              translationCount += translationBatch.length
            } catch (err) {
              console.error(`  ERROR: Cosmos upsert failed for translation batch: ${err}`)
            }
            translationBatch = []
          }
        }

        // Final partial parent batch
        if (parentBatch.length > 0) {
          try {
            await upsertBatch(container, parentBatch)
            migratedCount += parentBatch.length
          } catch (err) {
            console.error(`  ERROR: Cosmos upsert failed for parent batch: ${err}`)
            errorCount += parentBatch.length
          }
        }

        // Final translation flush
        const translationContainer = blogTranslationsContainer ?? userTranslationsContainer
        if (translationContainer && translationBatch.length > 0) {
          try {
            await upsertBatch(translationContainer, translationBatch)
            translationCount += translationBatch.length
          } catch (err) {
            console.error(`  ERROR: Cosmos upsert failed for final translation batch: ${err}`)
          }
        }
      }

      // Verify: count destination
      let destCountAfter = 0
      try {
        const { resources } = await container.items.query('SELECT VALUE COUNT(1) FROM c').fetchAll()
        destCountAfter = resources[0] ?? 0
      } catch (err) {
        console.error(`  WARNING: Could not verify destination count: ${err}`)
      }

      const status = errorCount === 0 && destCountAfter >= sourceCount ? 'OK' : 'MISMATCH'
      if (translationCount > 0) {
        console.log(`  Migrated: ${migratedCount} | Translations extracted: ${translationCount} | Errors: ${errorCount} | Dest count: ${destCountAfter}`)
      } else {
        console.log(`  Migrated: ${migratedCount} | Errors: ${errorCount} | Dest count: ${destCountAfter}`)
      }

      summary.push({
        collection: config.mongoCollection,
        source: sourceCount,
        destination: destCountAfter,
        status,
      })

      // Report translation container counts
      if (blogTranslationsContainer && translationCount > 0) {
        try {
          const { resources } = await blogTranslationsContainer.items.query('SELECT VALUE COUNT(1) FROM c').fetchAll()
          console.log(`  blogPostTranslations container count: ${resources[0] ?? 0}`)
          summary.push({
            collection: 'blogPostTranslations',
            source: translationCount,
            destination: resources[0] ?? 0,
            status: 'OK',
          })
        } catch (_) {}
      }
      if (userTranslationsContainer && translationCount > 0) {
        try {
          const { resources } = await userTranslationsContainer.items.query('SELECT VALUE COUNT(1) FROM c').fetchAll()
          console.log(`  userPageTranslations container count: ${resources[0] ?? 0}`)
          summary.push({
            collection: 'userPageTranslations',
            source: translationCount,
            destination: resources[0] ?? 0,
            status: 'OK',
          })
        } catch (_) {}
      }
    }

    console.log()
  }

  await mongoClient.close()

  // ---------------------------------------------------------------------------
  // Summary table
  // ---------------------------------------------------------------------------
  console.log('=== Summary ===')
  const COL1 = 20, COL2 = 8, COL3 = 13, COL4 = 10

  const divider = `|-${'-'.repeat(COL1)}-|-${'-'.repeat(COL2)}-|-${'-'.repeat(COL3)}-|-${'-'.repeat(COL4)}-|`
  console.log(`| ${pad('Collection', COL1)} | ${pad('Source', COL2)} | ${pad('Destination', COL3)} | ${pad('Status', COL4)} |`)
  console.log(divider)

  for (const row of summary) {
    console.log(
      `| ${pad(row.collection, COL1)} | ${pad(row.source, COL2)} | ${pad(row.destination === '—' ? '—' : String(row.destination), COL3)} | ${pad(row.status, COL4)} |`,
    )
  }

  if (!IS_CONFIRM) {
    console.log()
    console.log('To execute: run with --confirm flag')
  }
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
