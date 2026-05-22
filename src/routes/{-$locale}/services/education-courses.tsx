import { createFileRoute } from '@tanstack/react-router'
import { ServicePageTemplate } from '@/components/services/ServicePageTemplate'

export const Route = createFileRoute('/{-$locale}/services/education-courses')({
  head: () => ({
    meta: [
      { title: 'Education & Courses — Start HN' },
      {
        name: 'description',
        content:
          'Accounting, tax, and finance workshops that help teams understand obligations, reporting, and better financial decisions.',
      },
      { property: 'og:title', content: 'Education & Courses — Start HN' },
      {
        property: 'og:description',
        content:
          'Accounting, tax, and finance workshops that help teams understand obligations, reporting, and better financial decisions.',
      },
    ],
  }),
  component: EducationCourses,
})

function EducationCourses() {
  return <ServicePageTemplate serviceId="education" />
}
