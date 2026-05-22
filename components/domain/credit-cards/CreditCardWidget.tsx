'use client'
import Link from 'next/link'
import { CreditCard, ChevronRight, Sparkles } from 'lucide-react'

export function CreditCardWidget() {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-700/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-xs font-semibold text-zinc-200">Credit Cards</span>
        </div>
        <span className="text-[10px] text-zinc-500 font-medium">CredWise</span>
      </div>

      <p className="text-xs text-zinc-400 mb-1 font-medium">Find your best credit card</p>
      <p className="text-[11px] text-zinc-600 mb-3 leading-relaxed">
        Get ₹ net value-ranked picks based on your actual spend patterns.
      </p>

      <Link
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        href={'/credit-cards' as any}
        className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-emerald-500/8 border border-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/15 transition-colors group"
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          Get Recommendations
        </span>
        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  )
}
