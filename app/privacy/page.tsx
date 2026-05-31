// app/privacy/page.tsx — PUBLIC privacy policy (no auth; crawled by Google OAuth verification).
import type { Metadata } from 'next'
import { LegalShell } from '@/components/legal/LegalShell'
import { PrivacyPolicy, CookiePolicy } from '@/components/legal/policy-content'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How myFinGrid collects, stores, and uses your data — including read-only Gmail access for transaction import.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <PrivacyPolicy />
      <div className="mt-8 pt-6 border-t border-zinc-800">
        <h2 className="text-base font-semibold text-zinc-100 mb-4">Cookies</h2>
        <CookiePolicy />
      </div>
    </LegalShell>
  )
}
