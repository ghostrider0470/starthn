import { eq, desc, sql, and } from 'drizzle-orm'
import { parseJson, type Database } from '../client'
import { caseStudies, caseStudyDecisions, caseStudyResults, caseStudyTranslations } from '../schema'
import type { CaseStudyDto } from '../types/dtos'

export interface CreateCaseStudyInput {
  slug?: string
  title: string
  client?: string
  industry?: string
  description?: string
  executiveSummary?: string
  challenge?: string
  solution?: string
  techStack?: string[]
  tags?: string[]
  architectureDecisions?: { decision: string; rationale: string }[]
  results?: { metric: string; value: string; description?: string }[]
  isPublished: boolean
  isFeatured?: boolean
  coverImage?: string
}

export type UpdateCaseStudyInput = Partial<CreateCaseStudyInput>

export class CaseStudyRepository {
  constructor(private db: Database) {}

  async getPublished(locale?: string): Promise<CaseStudyDto[]> {
    const rows = await this.db.select().from(caseStudies)
      .where(eq(caseStudies.isPublished, 1))
      .orderBy(desc(caseStudies.createdAt))
    return Promise.all(rows.map(r => this.hydrate(r, locale)))
  }

  async getBySlug(slug: string, locale?: string): Promise<CaseStudyDto | null> {
    const rows = await this.db.select().from(caseStudies)
      .where(eq(caseStudies.slug, slug)).limit(1)
    if (rows.length === 0) return null
    return this.hydrate(rows[0], locale)
  }

  async create(input: CreateCaseStudyInput): Promise<CaseStudyDto> {
    const slug = input.slug || input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const id = crypto.randomUUID().replace(/-/g, '')
    const now = new Date().toISOString()

    await this.db.insert(caseStudies).values({
      id,
      slug,
      title: input.title,
      client: input.client ?? null,
      industry: input.industry ?? null,
      description: input.description ?? null,
      executiveSummary: input.executiveSummary ?? null,
      challenge: input.challenge ?? null,
      solution: input.solution ?? null,
      techStack: JSON.stringify(input.techStack ?? []),
      tags: JSON.stringify(input.tags ?? []),
      isPublished: input.isPublished ? 1 : 0,
      isFeatured: input.isFeatured ? 1 : 0,
      coverImage: input.coverImage ?? null,
      createdAt: now,
      updatedAt: now,
    })

    if (input.architectureDecisions?.length) {
      for (let i = 0; i < input.architectureDecisions.length; i++) {
        const d = input.architectureDecisions[i]
        await this.db.insert(caseStudyDecisions).values({
          id: crypto.randomUUID().replace(/-/g, ''),
          caseStudyId: id,
          decision: d.decision,
          rationale: d.rationale,
          sortOrder: i,
        })
      }
    }

    if (input.results?.length) {
      for (let i = 0; i < input.results.length; i++) {
        const r = input.results[i]
        await this.db.insert(caseStudyResults).values({
          id: crypto.randomUUID().replace(/-/g, ''),
          caseStudyId: id,
          metric: r.metric,
          value: r.value,
          description: r.description ?? null,
          sortOrder: i,
        })
      }
    }

    return (await this.getBySlug(slug))!
  }

  async update(slug: string, input: UpdateCaseStudyInput): Promise<CaseStudyDto | null> {
    const existing = await this.db.select({ id: caseStudies.id }).from(caseStudies).where(eq(caseStudies.slug, slug)).limit(1)
    if (existing.length === 0) return null
    const id = existing[0].id

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() }
    if (input.title !== undefined) updates.title = input.title
    if (input.slug !== undefined) updates.slug = input.slug
    if (input.client !== undefined) updates.client = input.client
    if (input.industry !== undefined) updates.industry = input.industry
    if (input.description !== undefined) updates.description = input.description
    if (input.executiveSummary !== undefined) updates.executiveSummary = input.executiveSummary
    if (input.challenge !== undefined) updates.challenge = input.challenge
    if (input.solution !== undefined) updates.solution = input.solution
    if (input.techStack !== undefined) updates.techStack = JSON.stringify(input.techStack)
    if (input.tags !== undefined) updates.tags = JSON.stringify(input.tags)
    if (input.isPublished !== undefined) updates.isPublished = input.isPublished ? 1 : 0
    if (input.isFeatured !== undefined) updates.isFeatured = input.isFeatured ? 1 : 0
    if (input.coverImage !== undefined) updates.coverImage = input.coverImage

    await this.db.update(caseStudies).set(updates).where(eq(caseStudies.id, id))

    if (input.architectureDecisions !== undefined) {
      await this.db.delete(caseStudyDecisions).where(eq(caseStudyDecisions.caseStudyId, id))
      for (let i = 0; i < input.architectureDecisions.length; i++) {
        const d = input.architectureDecisions[i]
        await this.db.insert(caseStudyDecisions).values({
          id: crypto.randomUUID().replace(/-/g, ''),
          caseStudyId: id,
          decision: d.decision,
          rationale: d.rationale,
          sortOrder: i,
        })
      }
    }

    if (input.results !== undefined) {
      await this.db.delete(caseStudyResults).where(eq(caseStudyResults.caseStudyId, id))
      for (let i = 0; i < input.results.length; i++) {
        const r = input.results[i]
        await this.db.insert(caseStudyResults).values({
          id: crypto.randomUUID().replace(/-/g, ''),
          caseStudyId: id,
          metric: r.metric,
          value: r.value,
          description: r.description ?? null,
          sortOrder: i,
        })
      }
    }

    const finalSlug = input.slug ?? slug
    return this.getBySlug(finalSlug)
  }

  async delete(slug: string): Promise<boolean> {
    const existing = await this.db.select({ id: caseStudies.id }).from(caseStudies).where(eq(caseStudies.slug, slug)).limit(1)
    if (existing.length === 0) return false
    const id = existing[0].id
    await this.db.delete(caseStudyDecisions).where(eq(caseStudyDecisions.caseStudyId, id))
    await this.db.delete(caseStudyResults).where(eq(caseStudyResults.caseStudyId, id))
    await this.db.delete(caseStudyTranslations).where(eq(caseStudyTranslations.caseStudyId, id))
    await this.db.delete(caseStudies).where(eq(caseStudies.id, id))
    return true
  }

  async getAll(): Promise<CaseStudyDto[]> {
    const rows = await this.db.select().from(caseStudies).orderBy(desc(caseStudies.createdAt))
    return Promise.all(rows.map(r => this.hydrate(r)))
  }

  private async hydrate(row: typeof caseStudies.$inferSelect, locale?: string): Promise<CaseStudyDto> {
    const [decisions, results, translation] = await Promise.all([
      this.db.select().from(caseStudyDecisions)
        .where(eq(caseStudyDecisions.caseStudyId, row.id))
        .orderBy(caseStudyDecisions.sortOrder),
      this.db.select().from(caseStudyResults)
        .where(eq(caseStudyResults.caseStudyId, row.id))
        .orderBy(caseStudyResults.sortOrder),
      locale
        ? this.db.select().from(caseStudyTranslations)
            .where(and(eq(caseStudyTranslations.caseStudyId, row.id), eq(caseStudyTranslations.locale, locale)))
            .limit(1).then(r => r[0] ?? null)
        : Promise.resolve(null),
    ])

    return {
      id: row.id,
      slug: row.slug,
      title: translation?.title ?? row.title,
      client: row.client,
      industry: row.industry,
      description: translation?.description ?? row.description,
      executiveSummary: translation?.executiveSummary ?? row.executiveSummary,
      challenge: translation?.challenge ?? row.challenge,
      solution: translation?.solution ?? row.solution,
      techStack: parseJson(row.techStack, []),
      tags: parseJson(row.tags, []),
      architectureDecisions: decisions.map(d => ({ decision: d.decision, rationale: d.rationale })),
      results: results.map(r => ({ metric: r.metric, value: r.value, description: r.description })),
      isPublished: row.isPublished === 1,
      isFeatured: row.isFeatured === 1,
      coverImage: row.coverImage,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }
}
