import { Link, createFileRoute, useLocation } from '@tanstack/react-router'
import { Users, ArrowRight, Mail, Linkedin, Github, Globe, Twitter, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { img } from '@/lib/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { designSystem } from '@/lib/design-system'
import { PageContainer } from '@/components/layout/PageContainer'
import { SectionContainer } from '@/components/layout/SectionContainer'
import { LoadingState } from '@/components/layout/LoadingState'
import { StandardCard } from '@/components/ui/standard-card'
import { cn } from '@/lib/utils'
import { TeamCultureSection } from '@/components/landing/TeamCultureSection'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { usePublicAuthors } from '@/hooks/useAuthorQueries'
import type { AuthorProfile } from '@/services/author.service'

export const Route = createFileRoute('/{-$locale}/team/')({
  head: () => ({
    meta: [
      { title: 'Our Team — Horizon Tech' },
      {
        name: 'description',
        content: 'Meet the engineers and leaders behind Horizon Tech.',
      },
      { property: 'og:title', content: 'Our Team — Horizon Tech' },
      {
        property: 'og:description',
        content: 'Meet the engineers and leaders behind Horizon Tech.',
      },
    ],
  }),
  component: TeamPage,
})

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

function TeamMemberCard({
  member,
  locale,
}: {
  member: AuthorProfile
  locale: string
}) {
  const { t } = useTranslation('pages')
  const bio = member.bio
    ? member.bio.length > 180
      ? `${member.bio.slice(0, 180)}...`
      : member.bio
    : null

  return (
    <Link to={withLocalePath(`/team/${member.slug}`, locale)} className="block h-full">
      <StandardCard variant="hover" className="h-full">
        <div className="flex flex-col items-center text-center">
          <Avatar className="mb-4 h-24 w-24">
            {member.avatarUrl && (
              <AvatarImage
                src={img(member.avatarUrl, { width: 192, format: 'auto' })}
                alt={`${member.firstName} ${member.lastName}`}
              />
            )}
            <AvatarFallback className="bg-primary/10 text-lg text-primary">
              {getInitials(member.firstName, member.lastName)}
            </AvatarFallback>
          </Avatar>

          <h3 className={cn(designSystem.typography.heading.h4, 'mb-1')}>
            {member.firstName} {member.lastName}
          </h3>

          {member.profession && (
            <p
              className={cn(
                designSystem.typography.body.small,
                'mb-3 font-medium text-primary',
              )}
            >
              {member.profession}
            </p>
          )}

          {bio && (
            <p
              className={cn(
                designSystem.typography.body.base,
                designSystem.typography.muted,
                'mb-4',
              )}
            >
              {bio}
            </p>
          )}

          {member.expertise.length > 0 && (
            <div className="mb-4 flex flex-wrap justify-center gap-2">
              {member.expertise.slice(0, 5).map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-auto flex items-center gap-3">
            {member.socialLinks.linkedIn && (
              <a
                href={member.socialLinks.linkedIn}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                aria-label={t('team.aria.linkedin', { name: `${member.firstName} ${member.lastName}` })}
              >
                <Linkedin className="h-4 w-4" />
              </a>
            )}
            {member.socialLinks.twitter && (
              <a
                href={member.socialLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <Twitter className="h-4 w-4" />
              </a>
            )}
            {member.socialLinks.gitHub && (
              <a
                href={member.socialLinks.gitHub}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <Github className="h-4 w-4" />
              </a>
            )}
            {member.socialLinks.website && (
              <a
                href={member.socialLinks.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <Globe className="h-4 w-4" />
              </a>
            )}
            {member.postCount > 0 && (
              <Badge variant="outline" className="text-xs ml-1">
                <FileText className="mr-1 h-3 w-3" />
                {member.postCount} {member.postCount === 1 ? 'article' : 'articles'}
              </Badge>
            )}
          </div>
        </div>
      </StandardCard>
    </Link>
  )
}

function TeamPage() {
  const { t } = useTranslation('pages')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)

  const { data: members, isLoading } = usePublicAuthors()

  return (
    <div className={cn('min-h-screen', designSystem.effects.gradient.subtle)}>
      {/* Hero */}
      <PageContainer>
        <div className="mx-auto max-w-4xl py-12 text-center">
          <Badge className="mb-4" variant="secondary">
            <Users className="mr-2 h-3 w-3" />
            {t('team.badge')}
          </Badge>
          <h1
            className={cn(
              designSystem.typography.heading.h1,
              'mb-6 sm:text-5xl md:text-6xl',
            )}
          >
            {t('team.hero.titlePrefix')}{' '}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t('team.hero.titleHighlight')}
            </span>
          </h1>
          <p
            className={cn(
              designSystem.typography.body.large,
              designSystem.typography.muted,
              'mb-8 sm:text-xl',
            )}
          >
            {t('team.hero.description')}
          </p>
        </div>
      </PageContainer>

      {/* Team Members */}
      <PageContainer>
        <SectionContainer spacing="lg">
          <div className="mb-12 text-center">
            <h2 className={cn(designSystem.typography.heading.h2, 'mb-4')}>
              {t('team.section.title')}
            </h2>
            <p
              className={cn(
                designSystem.typography.body.large,
                designSystem.typography.muted,
              )}
            >
              {t('team.section.description')}
            </p>
          </div>

          {isLoading ? (
            <LoadingState message={t('team.loading', 'Loading team...')} />
          ) : !members || members.length === 0 ? (
            <p
              className={cn(
                designSystem.typography.body.base,
                designSystem.typography.muted,
                'text-center',
              )}
            >
              {t('team.empty', 'Team information coming soon.')}
            </p>
          ) : (
            <div
              className={cn(
                members.length <= 3
                  ? designSystem.grid.responsive.two
                  : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
                designSystem.spacing.gap.lg,
              )}
            >
              {members.map((member) => (
                <TeamMemberCard
                  key={member.id}
                  member={member}
                  locale={currentLocale}
                />
              ))}
            </div>
          )}
        </SectionContainer>
      </PageContainer>

      {/* Culture Section */}
      <TeamCultureSection />

      {/* CTA */}
      <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
        <PageContainer>
          <SectionContainer spacing="lg" className="text-center">
            <h2 className={cn(designSystem.typography.heading.h2, 'mb-4')}>
              {t('team.cta.title')}
            </h2>
            <p
              className={cn(
                designSystem.typography.body.large,
                designSystem.typography.muted,
                'mx-auto mb-8 max-w-2xl',
              )}
            >
              {t('team.cta.description')}
            </p>
            <Button size="lg" asChild>
              <Link to={withLocalePath('/contact', currentLocale)}>
                {t('team.cta.button')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </SectionContainer>
        </PageContainer>
      </div>
    </div>
  )
}
