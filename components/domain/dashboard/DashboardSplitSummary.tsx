'use client'
import Link from 'next/link'
import { Users, ArrowRight } from 'lucide-react'
import { useSplitGroups } from '@/lib/queries/split'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { EmptyState } from '@/components/shared/EmptyState'

export function DashboardSplitSummary() {
  const { data, isLoading } = useSplitGroups()

  if (isLoading) return <div className="skeleton h-56 rounded-2xl" />

  const groups = data?.groups ?? []
  let owed = 0
  let owe = 0
  let active = 0
  for (const g of groups) {
    if (g.myNet > 0) owed += g.myNet
    else if (g.myNet < 0) owe += -g.myNet
    if (g.myNet !== 0) active += 1
  }
  const net = owed - owe

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-600/40 p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center">
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Split &amp; Share</h2>
            {groups.length > 0 && (
              <p className="text-xs text-zinc-500 mt-0.5">
                {active > 0 ? `${active} active ${active === 1 ? 'balance' : 'balances'}` : 'All settled up'}
              </p>
            )}
          </div>
        </div>
        <Link href="/split" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors inline-flex items-center gap-1">
          View <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No groups yet"
          description="Split a trip or track a shared budget with friends."
          className="py-6"
        />
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-xs text-zinc-500">
              {net > 0 ? 'Overall, you are owed' : net < 0 ? 'Overall, you owe' : 'Overall'}
            </p>
            {net !== 0 ? (
              <CurrencyDisplay amount={Math.abs(net)} size="xl" className={net > 0 ? 'text-emerald-400' : 'text-rose-400'} />
            ) : (
              <p className="text-xl font-semibold text-zinc-200 mt-0.5">You&apos;re all settled up</p>
            )}
          </div>
          <div className="flex items-center gap-6 pt-1 border-t border-zinc-800">
            <div className="pt-3">
              <p className="text-[11px] text-zinc-500">You are owed</p>
              <CurrencyDisplay amount={owed} size="sm" className="text-emerald-400" />
            </div>
            <div className="pt-3">
              <p className="text-[11px] text-zinc-500">You owe</p>
              <CurrencyDisplay amount={owe} size="sm" className="text-rose-400" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
