// components/legal/policy-content.tsx
// Shared, framework-agnostic policy copy. Rendered both in the in-app Settings
// tab (app/(dashboard)/settings/policy) and on the PUBLIC /privacy + /terms
// pages that Google OAuth verification crawls. No client hooks here, so it can
// render inside server components.

// MyFinGrid is operated from India; data resides in Supabase (ap-south-1 / Mumbai).
export const LAST_UPDATED = 'May 2026'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 last:mb-0">
      <h3 className="text-sm font-semibold text-emerald-400 mb-1.5">{title}</h3>
      <div className="text-sm text-zinc-300 leading-relaxed space-y-2">{children}</div>
    </section>
  )
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1 text-zinc-400">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  )
}

export function PrivacyPolicy() {
  return (
    <>
      <Section title="What we collect">
        <p>MyFinGrid collects only what it needs to run your money dashboard:</p>
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

      <Section title="Google user data (Gmail)">
        <p>
          If you choose to connect Gmail, MyFinGrid requests <strong>read-only</strong> access
          (<code className="text-emerald-300/90">gmail.readonly</code>) for a single purpose: to scan your inbox for bank and
          payment transaction emails so it can import those transactions into your dashboard. Connecting Gmail is entirely
          optional and the app works fully without it.
        </p>
        <p>
          MyFinGrid&apos;s use of information received from Google APIs adheres to the{' '}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. Specifically:
        </p>
        <Bullets
          items={[
            'We only use Gmail data to provide and improve the transaction-import feature you explicitly enabled.',
            'We do not transfer or sell Gmail data to third parties, and we do not use it for advertising.',
            'We do not allow humans to read your Gmail data, except where you give explicit consent, where required for security or to comply with applicable law, or where the data is aggregated and anonymised.',
            'You can revoke access at any time from your Google Account permissions, or by disconnecting Gmail in MyFinGrid settings.',
          ]}
        />
      </Section>

      <Section title="Your rights">
        <p>
          You can view and edit your data in the app at any time. To export or permanently delete everything, delete your
          account from the account menu — this removes your identity at Clerk and cascades a deletion of all your MyFinGrid
          records (transactions, budgets, goals, and split data).
        </p>
      </Section>

      <Section title="Contact">
        <p>Questions about your data? Reach out to the address associated with your MyFinGrid account support.</p>
      </Section>
    </>
  )
}

export function TermsOfService() {
  return (
    <>
      <Section title="Acceptance">
        <p>By using MyFinGrid you agree to these terms. If you do not agree, please discontinue use of the app.</p>
      </Section>

      <Section title="What MyFinGrid is">
        <p>
          MyFinGrid is a personal-finance tracking and planning tool. Its projections, AI insights, and recommendations are
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
          To the maximum extent permitted by law, MyFinGrid is not liable for any losses arising from financial decisions made
          using the app, or from any interruption, error, or data loss in the service.
        </p>
      </Section>
    </>
  )
}

export function CookiePolicy() {
  return (
    <>
      <Section title="What we use">
        <p>MyFinGrid keeps cookie use to a minimum. We currently use only strictly-necessary cookies:</p>
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
          may prevent MyFinGrid from working. You can clear cookies anytime via your browser settings.
        </p>
      </Section>
    </>
  )
}
