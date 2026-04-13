import { Link, createFileRoute, useLocation } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'

export const Route = createFileRoute('/{-$locale}/privacy')({
  head: () => ({
    meta: [
      { title: 'Privacy Policy — Horizon Tech' },
      {
        name: 'description',
        content: 'Horizon Tech privacy policy — how we handle your data.',
      },
      { property: 'og:title', content: 'Privacy Policy — Horizon Tech' },
      {
        property: 'og:description',
        content: 'Horizon Tech privacy policy — how we handle your data.',
      },
    ],
  }),
  component: PrivacyPolicyPage,
})

function PrivacyPolicyPage() {
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
              Privacy Policy
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
                  1. Introduction
                </h2>
                <p className={cn(designSystem.typography.body.base, 'mb-4')}>
                  Horizon Tech d.o.o. ("we," "our," or "us") is committed to
                  protecting your privacy and ensuring the security of your
                  personal information. This Privacy Policy explains how we
                  collect, use, disclose, and safeguard your information when
                  you use our software development services and website.
                </p>
              </section>

              <section>
                <h2 className={cn(designSystem.typography.heading.h3, 'mb-4')}>
                  2. Information We Collect
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3
                      className={cn(designSystem.typography.heading.h5, 'mb-2')}
                    >
                      Personal Information
                    </h3>
                    <ul className="list-disc space-y-2 pl-5">
                      <li>Name and contact information</li>
                      <li>Company name and job title</li>
                      <li>Account credentials</li>
                      <li>
                        Billing information (processed securely through
                        third-party providers)
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3
                      className={cn(designSystem.typography.heading.h5, 'mb-2')}
                    >
                      Project Data
                    </h3>
                    <ul className="list-disc space-y-2 pl-5">
                      <li>Project requirements and specifications</li>
                      <li>Technical documentation</li>
                      <li>Communication history related to projects</li>
                    </ul>
                  </div>

                  <div>
                    <h3
                      className={cn(designSystem.typography.heading.h5, 'mb-2')}
                    >
                      Usage Information
                    </h3>
                    <ul className="list-disc space-y-2 pl-5">
                      <li>Log data and analytics</li>
                      <li>Device and browser information</li>
                      <li>Usage patterns and preferences</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className={cn(designSystem.typography.heading.h3, 'mb-4')}>
                  3. How We Use Your Information
                </h2>
                <p className={cn(designSystem.typography.body.base, 'mb-4')}>
                  We use the collected information to:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    Provide and maintain our software development services
                  </li>
                  <li>Communicate with you about projects and services</li>
                  <li>Process payments and billing</li>
                  <li>Improve our services and user experience</li>
                  <li>
                    Send relevant updates and marketing communications (with
                    your consent)
                  </li>
                  <li>
                    Ensure compliance with legal and regulatory requirements
                  </li>
                  <li>Detect and prevent fraud or unauthorized access</li>
                </ul>
              </section>

              <section>
                <h2 className={cn(designSystem.typography.heading.h3, 'mb-4')}>
                  4. Data Storage and Security
                </h2>
                <p className={cn(designSystem.typography.body.base, 'mb-4')}>
                  We implement industry-standard security measures including:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Secure cloud storage with Microsoft Azure</li>
                  <li>Regular security audits and assessments</li>
                  <li>Access controls and authentication measures</li>
                  <li>Employee training on data security and privacy</li>
                  <li>Incident response procedures</li>
                </ul>
              </section>

              <section>
                <h2 className={cn(designSystem.typography.heading.h3, 'mb-4')}>
                  5. Data Sharing and Disclosure
                </h2>
                <p className={cn(designSystem.typography.body.base, 'mb-4')}>
                  We do not sell, trade, or rent your personal information. We
                  may share information:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>With your explicit consent</li>
                  <li>To comply with legal obligations</li>
                  <li>
                    With service providers who assist in our operations (under
                    strict confidentiality agreements)
                  </li>
                  <li>
                    To protect the rights, property, or safety of Horizon Tech,
                    our clients, or others
                  </li>
                  <li>
                    In connection with a merger, acquisition, or sale of assets
                  </li>
                </ul>
              </section>

              <section>
                <h2 className={cn(designSystem.typography.heading.h3, 'mb-4')}>
                  6. Data Retention
                </h2>
                <p className={cn(designSystem.typography.body.base, 'mb-4')}>
                  We retain your information for as long as necessary to provide
                  our services and comply with legal obligations. Project data
                  is retained according to contractual agreements and industry
                  standards. You may request deletion of your account and
                  associated data, subject to legal retention requirements.
                </p>
              </section>

              <section>
                <h2 className={cn(designSystem.typography.heading.h3, 'mb-4')}>
                  7. Your Rights and Choices
                </h2>
                <p className={cn(designSystem.typography.body.base, 'mb-4')}>
                  You have the right to:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>Access your personal information</li>
                  <li>Correct inaccurate or incomplete information</li>
                  <li>
                    Request deletion of your information (subject to legal
                    requirements)
                  </li>
                  <li>Opt-out of marketing communications</li>
                  <li>Export your data in a portable format</li>
                  <li>Lodge a complaint with a supervisory authority</li>
                </ul>
              </section>

              <section>
                <h2 className={cn(designSystem.typography.heading.h3, 'mb-4')}>
                  8. GDPR Compliance
                </h2>
                <p className={cn(designSystem.typography.body.base, 'mb-4')}>
                  For users in the European Economic Area (EEA), we process
                  personal data in accordance with the General Data Protection
                  Regulation (GDPR). We ensure that any international data
                  transfers are protected by appropriate safeguards.
                </p>
              </section>

              <section id="cookies" className="scroll-mt-24">
                <h2 className={cn(designSystem.typography.heading.h3, 'mb-4')}>
                  9. Cookies and Tracking Technologies
                </h2>
                <p className={cn(designSystem.typography.body.base, 'mb-4')}>
                  We use cookies and similar tracking technologies to:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>Maintain your session and authentication</li>
                  <li>Remember your preferences</li>
                  <li>Analyze usage patterns</li>
                  <li>Improve our services</li>
                </ul>
                <p className={cn(designSystem.typography.body.base, 'mt-4')}>
                  You can manage cookie preferences through your browser
                  settings.
                </p>
              </section>

              <section>
                <h2 className={cn(designSystem.typography.heading.h3, 'mb-4')}>
                  10. Changes to This Privacy Policy
                </h2>
                <p className={cn(designSystem.typography.body.base, 'mb-4')}>
                  We may update this Privacy Policy periodically. We will notify
                  you of any material changes via email or through our website.
                  Your continued use of our services after changes indicates
                  acceptance of the updated Privacy Policy.
                </p>
              </section>

              <section>
                <h2 className={cn(designSystem.typography.heading.h3, 'mb-4')}>
                  11. Contact Us
                </h2>
                <p className={cn(designSystem.typography.body.base, 'mb-4')}>
                  For questions about this Privacy Policy or our privacy
                  practices, please contact:
                </p>
                <div className="ml-4 space-y-1">
                  <p>
                    <strong>Horizon Tech d.o.o.</strong>
                  </p>
                  <p>Sarajevo, Bosnia and Herzegovina</p>
                  <p>Email: hello@horizon-tech.io</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
