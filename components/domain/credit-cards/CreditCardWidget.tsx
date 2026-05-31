'use client'
import Link from 'next/link'
import { CreditCard, ChevronRight, Sparkles } from 'lucide-react'

export function CreditCardWidget() {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-700/40 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
      {/* Left: icon + copy */}
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <CreditCard className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-200">Credit Cards</span>
            <span className="text-[10px] text-zinc-500 font-medium">CredWise</span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
            Find your best credit card — ₹ net value-ranked picks based on your actual spend patterns.
          </p>
        </div>
      </div>

      {/* Right: CTA */}
      <Link
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        href={'/credit-cards' as any}
        className="flex items-center justify-center gap-1.5 shrink-0 px-3.5 py-2 rounded-lg bg-emerald-500/8 border border-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/15 transition-colors group md:self-auto"
      >
        <Sparkles className="w-3 h-3" />
        Get Recommendations
        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  )
}
