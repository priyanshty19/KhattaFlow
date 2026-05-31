'use client'
import { useState } from 'react'
import { ShieldCheck, FileText, Cookie } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { cn } from '@/lib/utils/cn'

type Tab = 'privacy' | 'terms' | 'cookies'

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'privacy', label: 'Privacy', icon: ShieldCheck },
  { id: 'terms', label: 'Terms', icon: FileText },
  { id: 'cookies', label: 'Cookies', icon: Cookie },
]

// myFinGrid is operated from India; data resides in Supabase (ap-south-1 / Mumbai).
const LAST_UPDATED = 'May 2026'

export default function PolicyPage() {
  const [tab, setTab] = useState<Tab>('privacy')

  return (
    <>
      <TopBar title="Privacy & Terms" showQuickAdd={false} maxWidth="max-w-2xl" />
      <div className="flex flex-col gap-4 md:gap-6 px-4 md:px-6 lg:px-8 py-4 md:py-6 max-w-2xl mx-auto w-full">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100">Privacy &amp; Terms</h2>
          <p className="text-sm text-zinc-400 mt-0.5">How myFinGrid handles your data, and the terms of use.</p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700/50 rounded-lg p-0.5 self-start">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                tab === id ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="bg-zinc-900 border border-zinc-600/40 rounded-xl p-5 md:p-6">
          {tab === 'privacy' && <PrivacyPolicy />}
          {tab === 'terms' && <TermsOfService />}
          {tab === 'cookies' && <CookiePolicy />}
          <p className="text-xs text-zinc-600 mt-6 pt-4 border-t border-zinc-800">Last updated: {LAST_UPDATED}</p>
        </div>
      </div>
    </>
  )
}

// ── Reusable bits ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 last:mb-0">
      <h3 className="text-sm font-semibold text-emerald-400 mb-1.5">{title}</h3>
      <div className="text-sm text-zinc-300 leading-relaxed space-y-2">{children}</div>
    </section>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1 text-zinc-400">
      {items.map((it) => (
        <li key={it}>{it}</li>
      ))}
    </ul>
  )
}

// ── Content ─────────────────────────────────────────────────────────────────

function PrivacyPolicy() {
  return (
    <>
      <Section title="What we collect">
        <p>myFinGrid collects only what it needs to run your money dashboard:</p>
        <Bullets
          items={[
            'Account identity: your name and email address, managed by our auth provider (Clerk).',
            'Financial data you enter or import: transactions, budgets, categories, goals, and split-group expenses.',
            'Optional Gmail access (read-only) if you connect it, used solely to detect transaction emails for import.',
            'Optional phone number, only if you choose to add it.',
          ]}
        />
      </Section>

      <Section title="Where your data is stored">
        <p>
          Your data is stored in a PostgreSQL database hosted on Supabase in the <strong>ap-south-1 (Mumbai)</strong> region.
          Identity and login are handled by Clerk. AI-generated insights are produced by Google&apos;s Gemini API, and
          transactional emails are sent via Resend.
        </p>
      </Section>

      <Section title="How we use it">
        <Bullets
          items={[
            'To show your dashboards, budgets, goals, net worth, and split balances.',
            'To generate optional AI insights and recommendations from your own figures.',
            'To send transactional emails you trigger (e.g. split invites).',
          ]}
        />
        <p>We do not sell your data, and we do not use it for third-party advertising.</p>
      </Section>

      <Section title="Your rights">
        <p>
          You can view and edit your data in the app at any time. To export or permanently delete everything, delete your
          account from the account menu — this removes your identity at Clerk and cascades a deletion of all your myFinGrid
          records (transactions, budgets, goals, and split data).
        </p>
      </Section>

      <Section title="Contact">
        <p>Questions about your data? Reach out to the address associated with your myFinGrid account support.</p>
      </Section>
    </>
  )
}

function TermsOfService() {
  return (
    <>
      <Section title="Acceptance">
        <p>By using myFinGrid you agree to these terms. If you do not agree, please discontinue use of the app.</p>
      </Section>

      <Section title="What myFinGrid is">
        <p>
          myFinGrid is a personal-finance tracking and planning tool. Its projections, AI insights, and recommendations are
          informational only and are <strong>not financial, investment, tax, or legal advice</strong>. You are responsible
          for your own financial decisions.
        </p>
      </Section>

      <Section title="Your responsibilities">
        <Bullets
          items={[
            'Keep your login credentials secure and do not share your account.',
            'Provide accurate information; the quality of insights depends on your inputs.',
            'Use the service lawfully and do not attempt to disrupt or abuse it.',
          ]}
        />
      </Section>

      <Section title="Availability & changes">
        <p>
          The service is provided on an &quot;as is&quot; and &quot;as available&quot; basis. Features may change, and we
          may update these terms; continued use after changes constitutes acceptance.
        </p>
      </Section>

      <Section title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, myFinGrid is not liable for any losses arising from financial decisions made
          using the app, or from any interruption, error, or data loss in the service.
        </p>
      </Section>
    </>
  )
}

function CookiePolicy() {
  return (
    <>
      <Section title="What we use">
        <p>myFinGrid keeps cookie use to a minimum. We currently use only strictly-necessary cookies:</p>
        <Bullets
          items={[
            'Authentication & session cookies set by Clerk to keep you securely logged in.',
            'Cloudflare Turnstile cookies used during sign-up to tell humans from bots.',
          ]}
        />
      </Section>

      <Section title="What we don't use">
        <p>
          We do not currently use third-party analytics, advertising, or cross-site tracking cookies. If that ever changes,
          this policy and our consent banner will be updated first.
        </p>
      </Section>

      <Section title="Managing cookies">
        <p>
          Because the cookies above are essential to logging in and protecting the service, disabling them in your browser
          may prevent myFinGrid from working. You can clear cookies anytime via your browser settings.
        </p>
      </Section>
    </>
  )
}
