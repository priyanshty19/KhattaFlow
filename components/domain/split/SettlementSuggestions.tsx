'use client'
import { ArrowRight, Check } from 'lucide-react'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { useRecordSettlement, useUpdateGroup, type TransferDTO, type SplitMemberDTO } from '@/lib/queries/split'
import { cn } from '@/lib/utils/cn'

export function SettlementSuggestions({
  groupId,
  suggestions,
  members,
  simplifyDebts,
  canSimplify,
}: {
  groupId: string
  suggestions: TransferDTO[]
  members: SplitMemberDTO[]
  simplifyDebts: boolean
  canSimplify: boolean
}) {
  const record = useRecordSettlement(groupId)
  const update = useUpdateGroup(groupId)
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? '—'

  const SimplifyToggle = () =>
    canSimplify ? (
      <button
        role="switch"
        aria-checked={simplifyDebts}
        onClick={() => update.mutate({ simplifyDebts: !simplifyDebts })}
        disabled={update.isPending}
        title="Combine debts to reduce the number of payments"
        className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-60"
      >
        <span className={cn('relative w-8 h-[18px] rounded-full transition-colors shrink-0', simplifyDebts ? 'bg-emerald-500' : 'bg-zinc-700')}>
          <span className={cn('absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform', simplifyDebts && 'translate-x-[14px]')} />
        </span>
        Simplify debts
      </button>
    ) : (
      <span className="text-[11px] text-zinc-600">{simplifyDebts ? 'Simplified' : 'Itemised'}</span>
    )

  if (!suggestions.length) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4 text-center">
        <Check className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
        <p className="text-sm text-zinc-300">Everyone&apos;s settled up</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-200">Suggested settlements</h3>
        <SimplifyToggle />
      </div>
      <div className="space-y-2">
        {suggestions.map((s, i) => (
          <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-sm text-rose-400 truncate max-w-[90px]">{nameOf(s.fromMemberId)}</span>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            <span className="text-sm text-emerald-400 truncate max-w-[90px]">{nameOf(s.toMemberId)}</span>
            <CurrencyDisplay amount={s.amount} size="sm" className="ml-auto text-zinc-200" />
            <button
              onClick={() => record.mutate({ fromMemberId: s.fromMemberId, toMemberId: s.toMemberId, amount: s.amount })}
              disabled={record.isPending}
              className="h-7 px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium transition-colors disabled:opacity-50 shrink-0"
            >
              Mark paid
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
