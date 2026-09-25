import { createFileRoute, notFound } from '@tanstack/react-router'

// Leftover from the software-company template this site started from. It is
// not a Start HN service, so the URL is a real 404 instead of a temporary
// redirect to an unrelated accounting page. The file stays so the generated
// route tree does not change without a build.
export const Route = createFileRoute('/{-$locale}/services/digital-transformation')({
  beforeLoad: () => {
    throw notFound()
  },
  component: LegacyServiceRoute,
})

function LegacyServiceRoute() {
  return null
}
