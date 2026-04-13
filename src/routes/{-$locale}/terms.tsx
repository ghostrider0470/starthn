import { Link, createFileRoute, useLocation } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'

export const Route = createFileRoute('/{-$locale}/terms')({
  head: () => ({
    meta: [
      { title: 'Terms of Service — Start HN' },
      {
        name: 'description',
        content: 'Start HN terms of service.',
      },
      { property: 'og:title', content: 'Terms of Service — Start HN' },
      {
        property: 'og:description',
        content: 'Start HN terms of service.',
      },
    ],
  }),
  component: TermsOfServicePage,
})

function TermsOfServicePage() {
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)

  return (
    <div className={cn('min-h-screen', designSystem.effects.gradient.subtle)}>
      <div className={cn(designSystem.spacing.page.container, 'py-8')}>
        <div className="max-w-4xl mx-auto">
          <Link to={withLocalePath('/', currentLocale)}>
            <Button variant="ghost" size="sm" className="mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>

          <div className="bg-card rounded-lg shadow-sm p-5 sm:p-6 md:p-10">
            <h1 className={cn(designSystem.typography.heading.h1, 'mb-2')}>
              Terms of Service
            </h1>
            <p className={cn(designSystem.typography.muted, 'mb-8')}>
              Last updated:{' '}
              {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>

            <div className="space-y-8 text-foreground">
              <section>
                <h2 className={cn(designSystem.typography.heading.h3, 'mb-4')}>
                  1. Acceptance of Terms
                </h2>
                <p className={cn(designSystem.typography.body.base, 'mb-4')}>
                  By accessing and using services provided by Start HN
                  d.o.o. ("the Company", "we", "us"), you agree to be bound by
                  these Terms of Service and all applicable laws and
                  regulations. If you do not agree with any of these terms, you
                  are prohibited from using our services.
                </p>
              </section>

              <section>
                <h2 className={cn(designSystem.typography.heading.h3, 'mb-4')}>
                  2. Description of Services
                </h2>
                <p className={cn(designSystem.typography.body.base, 'mb-4')}>
                  Start HN d.o.o. provides software development services
                  including but not limited to:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>Custom software development</li>
                  <li>AI/ML solutions and implementation</li>
                  <li>Cloud architecture and migration</li>
                  <li>DevOps and platform engineering</li>
                  <li>Business intelligence and data analytics</li>
                  <li>IoT and edge computing solutions</li>
                  <li>Consulting and technical advisory</li>
                </ul>
              </section>

              <section>
                <h2 className={cn(designSystem.typography.heading.h3, 'mb-4')}>
                  3. User Accounts
                </h2>
                <p className={cn(designSystem.typography.body.base, 'mb-4')}>
                  To access certain features of our services, you may need to
                  create an account. You are responsible for:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    Maintaining the confidentiality of your account credentials
                  </li>
                  <li>All activities that occur under your account</li>
                  <li>Notifying us immediately of any unauthorized use</li>
                  <li>
                    Ensuring your account information is accurate and up-to-date
                  </li>
                </ul>
              </section>

              <section>
                <h2 className={cn(designSystem.typography.heading.h3, 'mb-4')}>
                  4. Project Agreements
                </h2>
                <p className={cn(designSystem.typography.body.base, 'mb-4')}>
                  Individual software development projects are governed by
                  separate project agreements that specify:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>Project scope and deliverables</li>
                  <li>Timeline and milestones</li>
                  <li>Pricing and payment terms</li>
                  <li>Intellectual property ownership</li>
                  <li>Confidentiality obligations</li>
                </ul>
                <p className={cn(designSystem.typography.body.base, 'mt-4')}>
                  These Terms of Service apply in addition to any
                  project-specific agreements.
                </p>
              </section>

              <section id="license" className="scroll-mt-24">
                <h2 className={cn(designSystem.typography.heading.h3, 'mb-4')}>
                  5. Intellectual Property
                </h2>
                <p className={cn(designSystem.typography.body.base, 'mb-4')}>
                  Unless otherwise specified in a project agreement:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    Client-provided materials remain the property of the client
                  </li>
                  <li>
                    Custom code developed for a project is assigned to the
                    client upon full payment
                  </li>
                  <li>
                    Pre-existing tools, libraries, and frameworks remain our
                    property
                  </li>
                  <li>
                    We retain the right to use general knowledge and skills
                    gained during projects
                  </li>
                </ul>
              </section>

              <section>
                <h2 className={cn(designSystem.typography.heading.h3, 'mb-4')}>
                  6. Confidentiality
                </h2>
                <p className={cn(designSystem.typography.body.base, 'mb-4')}>
                  We treat all client information as confidential. We will not
                  disclose your business information, project details, or
                  proprietary data to third parties without your consent, except
                  as required by law.
                </p>
              </section>

              <section>
                <h2 className={cn(designSystem.typography.heading.h3, 'mb-4')}>
                  7. Acceptable Use
                </h2>
                <p className={cn(designSystem.typography.body.base, 'mb-4')}>
                  You agree not to:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>Use our services for any unlawful purpose</li>
                  <li>Provide false or misleading information</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Misrepresent your identity or affiliation</li>
                  <li>Infringe on intellectual property rights</li>
                </ul>
              </section>

              <section>
                <h2 className={cn(designSystem.typography.heading.h3, 'mb-4')}>
                  8. Limitation of Liability
                </h2>
                <p className={cn(designSystem.typography.body.base, 'mb-4')}>
                  To the maximum extent permitted by law, Start HN d.o.o.
                  shall not be liable for any indirect, incidental, special,
                  consequential, or punitive damages resulting from your use of
                  our services, including but not limited to loss of profits,
                  data, or business opportunities.
                </p>
              </section>

              <section>
                <h2 className={cn(designSystem.typography.heading.h3, 'mb-4')}>
                  9. Warranty Disclaimer
                </h2>
                <p className={cn(designSystem.typography.body.base, 'mb-4')}>
                  While we strive to deliver high-quality solutions, our
                  services are provided "as is" without warranties of any kind,
                  either express or implied. Specific warranties may be included
                  in individual project agreements.
                </p>
              </section>

              <section>
                <h2 className={cn(designSystem.typography.heading.h3, 'mb-4')}>
                  10. Termination
                </h2>
                <p className={cn(designSystem.typography.body.base, 'mb-4')}>
                  Either party may terminate a service relationship according to
                  the terms specified in the applicable project agreement. We
                  reserve the right to refuse service to anyone for any reason
                  at any time.
                </p>
              </section>

              <section>
                <h2 className={cn(designSystem.typography.heading.h3, 'mb-4')}>
                  11. Governing Law
                </h2>
                <p className={cn(designSystem.typography.body.base, 'mb-4')}>
                  These Terms shall be governed by and construed in accordance
                  with the laws of Bosnia and Herzegovina. Any disputes arising
                  from these Terms shall be resolved in the courts of Sarajevo,
                  Bosnia and Herzegovina.
                </p>
              </section>

              <section>
                <h2 className={cn(designSystem.typography.heading.h3, 'mb-4')}>
                  12. Changes to Terms
                </h2>
                <p className={cn(designSystem.typography.body.base, 'mb-4')}>
                  We reserve the right to modify these Terms at any time. We
                  will notify users of any material changes via email or through
                  our website. Continued use after changes constitutes
                  acceptance of the modified Terms.
                </p>
              </section>

              <section>
                <h2 className={cn(designSystem.typography.heading.h3, 'mb-4')}>
                  13. Contact Information
                </h2>
                <p className={cn(designSystem.typography.body.base, 'mb-4')}>
                  For questions about these Terms of Service, please contact us
                  at:
                </p>
                <div className="ml-4 space-y-1">
                  <p>
                    <strong>StartHN</strong>
                  </p>
                  <p>Sarajevo, Bosnia and Herzegovina</p>
                  <p>Email: info@starthn.ba</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
