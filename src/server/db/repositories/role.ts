import { eq, notInArray, sql } from 'drizzle-orm'
import { parseJson, type Database } from '../client'
import { roles } from '../schema'
import type { RoleDto } from '../types/dtos'

export interface CreateRoleInput {
  name: string
  description?: string
  permissions: string[]
}

export type UpdateRoleInput = Partial<CreateRoleInput>

export class RoleRepository {
  constructor(private db: Database) {}

  async getAll(): Promise<RoleDto[]> {
    const rows = await this.db.select().from(roles).orderBy(roles.name)
    return rows.map(r => this.toDto(r))
  }

  async getPublic(): Promise<RoleDto[]> {
    const rows = await this.db.select().from(roles)
      .where(notInArray(roles.name, ['superadmin']))
      .orderBy(roles.name)
    return rows.map(r => this.toDto(r))
  }

  async create(input: CreateRoleInput): Promise<RoleDto> {
    const id = crypto.randomUUID().replace(/-/g, '')
    const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const now = new Date().toISOString()

    await this.db.insert(roles).values({
      id,
      name: input.name,
      slug,
      description: input.description ?? null,
      permissions: JSON.stringify(input.permissions),
      isSystem: 0,
      createdAt: now,
      updatedAt: now,
    })

    return (await this.getById(id))!
  }

  async update(id: string, input: UpdateRoleInput): Promise<RoleDto | null> {
    const existing = await this.db.select().from(roles).where(eq(roles.id, id)).limit(1)
    if (existing.length === 0) return null

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() }
    if (input.name !== undefined) {
      updates.name = input.name
      updates.slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    }
    if (input.description !== undefined) updates.description = input.description
    if (input.permissions !== undefined) updates.permissions = JSON.stringify(input.permissions)

    await this.db.update(roles).set(updates).where(eq(roles.id, id))
    return this.getById(id)
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.db.select().from(roles).where(eq(roles.id, id)).limit(1)
    if (existing.length === 0) return false
    if (existing[0].isSystem === 1) return false // Don't delete system roles
    await this.db.delete(roles).where(eq(roles.id, id))
    return true
  }

  async getById(id: string): Promise<RoleDto | null> {
    const rows = await this.db.select().from(roles).where(eq(roles.id, id)).limit(1)
    if (rows.length === 0) return null
    return this.toDto(rows[0])
  }

  private toDto(row: typeof roles.$inferSelect): RoleDto {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      permissions: parseJson(row.permissions, []),
      isSystem: row.isSystem === 1,
    }
  }
}
