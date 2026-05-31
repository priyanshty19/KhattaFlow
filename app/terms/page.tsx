// app/terms/page.tsx — PUBLIC terms of service (no auth; crawled by Google OAuth verification).
import type { Metadata } from 'next'
import { LegalShell } from '@/components/legal/LegalShell'
import { TermsOfService } from '@/components/legal/policy-content'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms governing your use of myFinGrid.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service">
      <TermsOfService />
    </LegalShell>
  )
}
