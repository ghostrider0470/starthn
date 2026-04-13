import { eq, sql, and, like, desc } from 'drizzle-orm'
import { parseJson, parseJsonString, type Database } from '../client'
import { users, userRoles, roles, blogPosts } from '../schema'
import type { UserDto, AuthorDto } from '../types/dtos'

export class UserRepository {
  constructor(private db: Database) {}

  async getById(id: string): Promise<UserDto | null> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1)
    if (rows.length === 0) return null
    return this.toDto(rows[0], await this.getUserRoles(id))
  }

  async getByEmail(email: string): Promise<(UserDto & { passwordHash: string | null }) | null> {
    const rows = await this.db.select().from(users).where(eq(users.email, email)).limit(1)
    if (rows.length === 0) return null
    const r = rows[0]
    const userRoleNames = await this.getUserRoles(r.id)
    return { ...this.toDto(r, userRoleNames), passwordHash: r.passwordHash }
  }

  async getBySlug(slug: string): Promise<UserDto | null> {
    const rows = await this.db.select().from(users).where(eq(users.slug, slug)).limit(1)
    if (rows.length === 0) return null
    return this.toDto(rows[0], await this.getUserRoles(rows[0].id))
  }

  /** Admin: paginated user list with optional search and role filter */
  async getAdminList(opts: { search?: string; role?: string; page?: number; pageSize?: number } = {}) {
    const page = opts.page ?? 1
    const pageSize = opts.pageSize ?? 20
    const offset = (page - 1) * pageSize

    let query = this.db.select().from(users).orderBy(desc(users.createdAt)).$dynamic()

    if (opts.search) {
      const term = `%${opts.search}%`
      query = query.where(
        sql`(${users.email} LIKE ${term} OR ${users.firstName} LIKE ${term} OR ${users.lastName} LIKE ${term})`,
      ) as any
    }

    // Get total first
    const countResult = await this.db.select({ count: sql<number>`COUNT(*)` }).from(users)
    const total = countResult[0]?.count ?? 0

    const rows = await query.limit(pageSize).offset(offset)

    const userDtos = await Promise.all(rows.map(async (r: any) => {
      const roleNames = await this.getUserRoles(r.id)
      if (opts.role && !roleNames.includes(opts.role)) return null
      return {
        id: r.id,
        email: r.email,
        firstName: r.firstName,
        lastName: r.lastName,
        avatarUrl: r.avatarUrl,
        roles: roleNames,
        isActive: r.isActive === 1,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        slug: r.slug,
        profession: r.profession,
      }
    }))

    return {
      users: userDtos.filter(Boolean),
      total,
      page,
      pageSize,
    }
  }

  /** Admin: update user roles */
  async updateRoles(userId: string, roleNames: string[]): Promise<boolean> {
    const user = await this.db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1)
    if (user.length === 0) return false

    // Get role IDs by name
    const allRoles = await this.db.select().from(roles)
    const nameToId = new Map(allRoles.map(r => [r.name, r.id]))

    await this.db.delete(userRoles).where(eq(userRoles.userId, userId))
    for (const name of roleNames) {
      const roleId = nameToId.get(name)
      if (roleId) {
        await this.db.insert(userRoles).values({ userId, roleId })
      }
    }
    return true
  }

  /** Admin: activate/deactivate user */
  async updateStatus(userId: string, isActive: boolean): Promise<boolean> {
    const user = await this.db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1)
    if (user.length === 0) return false
    await this.db.update(users).set({ isActive: isActive ? 1 : 0, updatedAt: new Date().toISOString() }).where(eq(users.id, userId))
    return true
  }

  /** Admin: update author profile */
  async updateAuthorProfile(userId: string, data: { bio?: string; profession?: string; expertise?: string[]; socialLinks?: Record<string, string>; slug?: string }) {
    const user = await this.db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1)
    if (user.length === 0) return null

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() }
    if (data.bio !== undefined) updates.bio = data.bio
    if (data.profession !== undefined) updates.profession = data.profession
    if (data.expertise !== undefined) updates.expertise = JSON.stringify(data.expertise)
    if (data.slug !== undefined) updates.slug = data.slug
    if (data.socialLinks) {
      if (data.socialLinks.linkedin !== undefined) updates.socialLinkedin = data.socialLinks.linkedin
      if (data.socialLinks.twitter !== undefined) updates.socialTwitter = data.socialLinks.twitter
      if (data.socialLinks.github !== undefined) updates.socialGithub = data.socialLinks.github
      if (data.socialLinks.website !== undefined) updates.socialWebsite = data.socialLinks.website
    }

    await this.db.update(users).set(updates).where(eq(users.id, userId))
    return this.getById(userId)
  }

  /** Admin stats */
  async getStats() {
    const [userCount, postCount, publishedCount] = await Promise.all([
      this.db.select({ count: sql<number>`COUNT(*)` }).from(users).then(r => r[0]?.count ?? 0),
      this.db.select({ count: sql<number>`COUNT(*)` }).from(blogPosts).then(r => r[0]?.count ?? 0),
      this.db.select({ count: sql<number>`COUNT(*)` }).from(blogPosts).where(eq(blogPosts.isPublished, 1)).then(r => r[0]?.count ?? 0),
    ])
    return { totalUsers: userCount, totalPosts: postCount, publishedPosts: publishedCount }
  }

  async getAuthors(): Promise<AuthorDto[]> {
    const rows = await this.db
      .select({
        user: users,
        postCount: sql<number>`COUNT(${blogPosts.id})`,
      })
      .from(users)
      .leftJoin(blogPosts, and(eq(blogPosts.authorId, users.id), eq(blogPosts.isPublished, 1)))
      .where(and(eq(users.isActive, 1), sql`${users.slug} IS NOT NULL`))
      .groupBy(users.id)
      .orderBy(users.firstName)

    return rows.map(r => ({
      id: r.user.id,
      firstName: r.user.firstName,
      lastName: r.user.lastName,
      avatarUrl: r.user.avatarUrl,
      bio: r.user.bio,
      profession: r.user.profession,
      slug: r.user.slug,
      expertise: parseJson<string[]>(r.user.expertise, []),
      pageContent: parseJsonString(r.user.pageContent),
      socialLinks: {
        linkedIn: r.user.socialLinkedin,
        twitter: r.user.socialTwitter,
        gitHub: r.user.socialGithub,
        website: r.user.socialWebsite,
      },
      postCount: r.postCount ?? 0,
    }))
  }

  private async getUserRoles(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ name: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, userId))
    return rows.map(r => r.name)
  }

  private toDto(row: typeof users.$inferSelect, roleNames: string[]): UserDto {
    return {
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      phoneNumber: row.phoneNumber,
      isActive: row.isActive === 1,
      avatarUrl: row.avatarUrl,
      bio: row.bio,
      profession: row.profession,
      expertise: parseJson(row.expertise, []),
      pageContent: parseJsonString(row.pageContent),
      socialLinks: {
        linkedIn: row.socialLinkedin,
        twitter: row.socialTwitter,
        gitHub: row.socialGithub,
        website: row.socialWebsite,
      },
      slug: row.slug,
      roles: roleNames,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }
}
