// components/legal/LegalShell.tsx
// Public, unauthenticated shell for the /privacy and /terms pages.
import Link from 'next/link'
import { Logo } from '@/components/shared/Logo'
import { LAST_UPDATED } from '@/components/legal/policy-content'

export function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <div
        className="pointer-events-none fixed inset-0 opacity-60"
        style={{ background: 'radial-gradient(ellipse 100% 60% at 50% 0%, rgba(16,185,129,0.08) 0%, transparent 65%)' }}
      />
      <div className="relative z-10 mx-auto w-full max-w-2xl px-5 py-10 md:py-14">
        {/* Header: brand + cross-links */}
        <div className="flex items-center justify-between mb-8">
          <Logo size="md" href="/landing" />
          <nav className="flex items-center gap-4 text-xs font-medium">
            <Link href={'/privacy' as any} className="text-zinc-400 hover:text-zinc-200 transition-colors">Privacy</Link>
            <Link href={'/terms' as any} className="text-zinc-400 hover:text-zinc-200 transition-colors">Terms</Link>
          </nav>
        </div>

        <h1 className="text-2xl font-bold text-zinc-100">{title}</h1>
        <p className="text-sm text-zinc-500 mt-1">Last updated: {LAST_UPDATED}</p>

        <div className="mt-6 bg-zinc-900 border border-zinc-600/40 rounded-xl p-5 md:p-7">
          {children}
        </div>

        <p className="text-xs text-zinc-600 mt-8 text-center">
          © {new Date().getFullYear()} myFinGrid ·{' '}
          <Link href={'/landing' as any} className="hover:text-zinc-400 transition-colors">Home</Link>
        </p>
      </div>
    </div>
  )
}
