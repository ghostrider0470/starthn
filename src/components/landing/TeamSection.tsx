import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Mail, Linkedin } from 'lucide-react'

type TeamMember = {
  name: string
  role: string
  avatar: string
  bio: string
  expertise: string[]
  email?: string
  linkedin?: string
}

const team: TeamMember[] = [
  {
    name: 'Hamza Kyamanywa',
    role: 'CEO & Founder',
    avatar: 'HK',
    bio: 'Full-stack engineer turned entrepreneur with a passion for building scalable software solutions. Leads Horizon Tech\'s vision for delivering world-class digital products.',
    expertise: ['Cloud Architecture', 'Enterprise Strategy', 'Technical Leadership'],
    email: 'hamza@horizonhub.tech',
    linkedin: '#',
  },
  {
    name: 'Daniel Ortega',
    role: 'Chief Technology Officer',
    avatar: 'DO',
    bio: 'Seasoned architect with deep expertise in distributed systems and cloud-native applications. Drives technical excellence across all Horizon projects.',
    expertise: ['Microservices', 'DevOps', 'System Design'],
    email: 'daniel@horizonhub.tech',
    linkedin: '#',
  },
  {
    name: 'Aisha Patel',
    role: 'Lead Solutions Architect',
    avatar: 'AP',
    bio: 'Specializes in designing complex enterprise integrations and modernizing legacy systems. Bridges the gap between business requirements and technical implementation.',
    expertise: ['API Design', 'Cloud Migration', 'Event-Driven Architecture'],
    email: 'aisha@horizonhub.tech',
    linkedin: '#',
  },
  {
    name: 'Marcus Chen',
    role: 'Head of Engineering',
    avatar: 'MC',
    bio: 'Leads Horizon\'s engineering teams with a focus on quality, velocity, and developer experience. Champion of automated testing and continuous delivery.',
    expertise: [
      'AI/ML Engineering',
      'Platform Engineering',
      'Team Leadership',
    ],
    email: 'marcus@horizonhub.tech',
    linkedin: '#',
  },
  {
    name: 'Azra Omerbašić',
    role: 'Chief Office Manager',
    avatar: 'AO',
    bio: 'Leads office operations, coordination, and administrative execution across Horizon Tech.',
    expertise: ['Office Operations', 'Team Coordination', 'Administration'],
  },
]

export function TeamSection() {
  return (
    <section className="bg-secondary/30 px-4 py-24">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Our Team
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Meet the engineers and architects behind Horizon Tech's
            innovative solutions
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {team.map((member) => (
            <Card
              key={member.name}
              className="overflow-hidden transition-all hover:shadow-lg"
            >
              <CardContent className="p-6">
                <div className="mb-4 flex justify-center">
                  <Avatar className="h-24 w-24">
                    <AvatarImage
                      src={`https://avatar.vercel.sh/${member.name}`}
                    />
                    <AvatarFallback className="text-lg">
                      {member.avatar}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="text-center">
                  <h3 className="text-lg font-semibold">{member.name}</h3>
                  <p className="mb-3 text-sm text-muted-foreground">
                    {member.role}
                  </p>

                  <p className="mb-4 text-sm text-muted-foreground">
                    {member.bio}
                  </p>

                  <div className="mb-4 flex flex-wrap justify-center gap-1">
                    {member.expertise.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="text-xs"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>

                  {(member.email || member.linkedin) && (
                    <div className="flex justify-center gap-3">
                      {member.email && (
                        <a
                          href={`mailto:${member.email}`}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                          aria-label={`Email ${member.name}`}
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                      )}
                      {member.linkedin && (
                        <a
                          href={member.linkedin}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                          aria-label={`${member.name} LinkedIn`}
                        >
                          <Linkedin className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="mb-4 text-lg text-muted-foreground">
            Want to join our team of experts?
          </p>
          <Button variant="outline">View Open Positions</Button>
        </div>
      </div>
    </section>
  )
}
