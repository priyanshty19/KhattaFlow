'use client'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import type { BalanceDTO, SplitMemberDTO } from '@/lib/queries/split'
import { cn } from '@/lib/utils/cn'

export function BalanceSummary({ balances, members, myMemberId }: { balances: BalanceDTO[]; members: SplitMemberDTO[]; myMemberId: string }) {
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? '—'
  const mine = balances.find((b) => b.memberId === myMemberId)
  const myNet = mine?.net ?? 0

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-200">Balances</h3>
        <div className="text-right">
          <p className="text-[11px] text-zinc-500">{myNet > 0 ? 'You are owed' : myNet < 0 ? 'You owe' : 'You are settled up'}</p>
          {myNet !== 0 && <CurrencyDisplay amount={Math.abs(myNet)} size="md" className={myNet > 0 ? 'text-emerald-400' : 'text-rose-400'} />}
        </div>
      </div>
      <div className="space-y-1.5">
        {balances.map((b) => (
          <div key={b.memberId} className="flex items-center justify-between text-sm">
            <span className={cn('truncate', b.memberId === myMemberId ? 'text-zinc-100 font-medium' : 'text-zinc-400')}>
              {nameOf(b.memberId)}{b.memberId === myMemberId ? ' (you)' : ''}
            </span>
            <span className={cn('tabular-nums text-xs', b.net > 0 ? 'text-emerald-400' : b.net < 0 ? 'text-rose-400' : 'text-zinc-500')}>
              {b.net === 0 ? 'settled' : (b.net > 0 ? '+' : '−')}
              {b.net !== 0 && <CurrencyDisplay amount={Math.abs(b.net)} size="xs" className="ml-0.5" />}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
