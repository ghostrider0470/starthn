import { createFileRoute } from '@tanstack/react-router'
import { ServicePageTemplate } from '@/components/services/ServicePageTemplate'
import { localizedServiceHead } from '@/lib/seo-meta'

export const Route = createFileRoute('/{-$locale}/services/education-courses')({
  head: ({ params }) => localizedServiceHead('education', params.locale),
  component: EducationCourses,
})

function EducationCourses() {
  return <ServicePageTemplate serviceId="education" />
}
