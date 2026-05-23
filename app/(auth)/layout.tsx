import type { ReactNode } from 'react'
import { TrendingUp, Brain, CreditCard, ArrowUpRight } from 'lucide-react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 lg:grid lg:grid-cols-2">

      {/* ── Left panel — brand + mock dashboard preview ── */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden border-r border-zinc-800/60">

        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 20% 50%, rgba(16,185,129,0.10) 0%, transparent 70%)',
          }}
        />
        {/* Dot-grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle, #3f3f46 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Top — logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <span className="text-lg font-semibold text-zinc-100 tracking-tight">FinGrid</span>
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

            {/* Credit Cards chip */}
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
          <p className="text-xs text-zinc-600">
            Join Indians tracking ₹ the smart way
          </p>
        </div>
      </div>

      {/* ── Right panel — Clerk widget ── */}
      <div className="flex flex-col items-center justify-center min-h-screen lg:min-h-0 px-6 py-12">
        {/* Mobile-only logo */}
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <span className="text-base font-semibold text-zinc-100">FinGrid</span>
        </div>
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>

    </div>
  )
}
