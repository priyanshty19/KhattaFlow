import type { ReactNode } from 'react'
import { TrendingUp, Brain, CreditCard, ArrowUpRight } from 'lucide-react'
import { Logo } from '@/components/shared/Logo'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950">

      {/* ════════════════════════════════════════════════════════
          MOBILE ONLY — compact brand banner (hidden on desktop)
          ════════════════════════════════════════════════════════ */}
      <div className="lg:hidden relative overflow-hidden px-6 pt-10 pb-8">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 120% 80% at 50% 0%, rgba(16,185,129,0.13) 0%, transparent 65%)' }} />
        {/* Dot-grid */}
        <div className="pointer-events-none absolute inset-0 opacity-15"
          style={{ backgroundImage: 'radial-gradient(circle, #3f3f46 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

        <div className="relative z-10 flex flex-col items-center text-center gap-4">
          <Logo size="lg" href={null} />
          <div>
            <h1 className="text-2xl font-bold text-zinc-100 leading-snug">
              Your finances,<br />finally clear.
            </h1>
            <p className="mt-1.5 text-zinc-400 text-sm">
              Track, save &amp; invest — powered by AI.
            </p>
          </div>

          {/* Condensed stat chips */}
          <div className="flex flex-wrap justify-center gap-2 w-full max-w-xs">
            <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800/70 rounded-xl px-3 py-2 backdrop-blur-sm">
              <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                <TrendingUp className="w-3 h-3 text-zinc-400" />
              </div>
              <div className="text-left">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-none">Income</p>
                <p className="text-sm font-bold text-zinc-100 tabular-nums leading-tight">₹1,08,500</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800/70 rounded-xl px-3 py-2 backdrop-blur-sm">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-none">Saved</p>
                <p className="text-sm font-bold text-emerald-400 tabular-nums leading-tight">₹68,870</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-3 py-2">
              <Brain className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <p className="text-[11px] text-emerald-400 font-medium">63.5% savings — best month yet</p>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          SHARED WRAPPER — single-column on mobile, two-column on desktop.
          {children} is rendered ONCE here so Clerk mounts exactly one
          SignUp/SignIn instance and Turnstile always targets a visible node.
          ════════════════════════════════════════════════════════ */}
      <div className="lg:grid lg:grid-cols-2 lg:min-h-screen">

        {/* ── Left panel — brand + full preview (desktop only) ── */}
        <div className="hidden lg:flex lg:flex-col lg:justify-between p-12 relative overflow-hidden border-r border-zinc-800/60">

          {/* Ambient glow */}
          <div className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 80% 60% at 20% 50%, rgba(16,185,129,0.10) 0%, transparent 70%)' }} />
          {/* Dot-grid */}
          <div className="pointer-events-none absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle, #3f3f46 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

          {/* Top — logo */}
          <div className="relative z-10">
            <Logo size="md" href={null} />
          </div>

          {/* Middle — tagline + mock cards */}
          <div className="relative z-10 space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-zinc-100 leading-tight">
                Your finances,<br />finally clear.
              </h2>
              <p className="mt-3 text-zinc-400 text-sm leading-relaxed max-w-xs">
                Track income, expenses, savings and investments — all in one place, powered by AI.
              </p>
            </div>

            {/* Mock stat cards */}
            <div className="space-y-3 max-w-sm">

              {/* Card 1 — Income */}
              <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-2xl p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center">
                      <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                    <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Income</span>
                  </div>
                  <span className="text-[10px] text-zinc-600">May 2026</span>
                </div>
                <p className="text-2xl font-bold text-zinc-100 tabular-nums">₹1,08,500</p>
                <p className="text-xs text-zinc-500 mt-0.5">Total inflow this month</p>
              </div>

              {/* Card 2 — Saved & Invested */}
              <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-2xl p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Saved & Invested</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    on track ✓
                  </span>
                </div>
                <p className="text-2xl font-bold text-emerald-400 tabular-nums">₹68,870</p>
                <p className="text-xs text-zinc-500 mt-0.5">63.5% savings rate · above your goal</p>
              </div>

              {/* AI insight chip */}
              <div className="flex items-start gap-3 bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-3">
                <Brain className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] font-medium text-emerald-400">Gemini AI Insight</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                    Your savings rate is up <span className="text-emerald-400 font-medium">63.5%</span> from last month — your best month yet.
                  </p>
                </div>
              </div>

              {/* CredWise chip */}
              <div className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800/40 rounded-xl px-4 py-3">
                <CreditCard className="w-4 h-4 text-zinc-400 shrink-0" />
                <p className="text-[11px] text-zinc-400">
                  <span className="text-zinc-200 font-medium">CredWise</span> — find the best credit card for your actual spend pattern
                </p>
              </div>
            </div>
          </div>

          {/* Bottom — social proof */}
          <div className="relative z-10">
            <p className="text-xs text-zinc-600">Join Indians tracking ₹ the smart way</p>
          </div>
        </div>

        {/* ── Form panel — always rendered, full-width on mobile / right column on desktop ──
            No overflow-y-auto: Clerk's Cloudflare Turnstile uses position:fixed internally
            and gets clipped by overflow:auto ancestors in Chrome. */}
        <div className="flex flex-col items-center justify-center px-5 py-8 lg:px-8 lg:py-12">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>

      </div>

    </div>
  )
}
