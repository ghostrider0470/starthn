import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

const FAQSection = lazy(() => import('@/components/landing/FAQSection').then(m => ({ default: m.FAQSection })))

export const Route = createFileRoute('/{-$locale}/faq')({
  component: FAQPageComponent,
})

function FAQPageComponent() {
  return (
    <div className="min-h-screen pt-16 pb-16">
      <Suspense fallback={null}>
        <FAQSection />
      </Suspense>
    </div>
  )
}
