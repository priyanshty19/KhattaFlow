'use client'
import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { toPaise } from '@/lib/utils/currency'
import { useUpsertContribution, useRecomputeObligations, type CycleDTO, type SplitMemberDTO } from '@/lib/queries/split'
import { cn } from '@/lib/utils/cn'

const STATUS_STYLE: Record<string, string> = {
  complete: 'text-emerald-400 bg-emerald-500/10',
  partial: 'text-amber-400 bg-amber-500/10',
  overdue: 'text-rose-400 bg-rose-500/10',
  pending: 'text-zinc-400 bg-zinc-800',
}

export function ContributionTracker({
  groupId,
  cycle,
  members,
}: {
  groupId: string
  cycle: CycleDTO
  members: SplitMemberDTO[]
}) {
  const upsert = useUpsertContribution(groupId)
  const recompute = useRecomputeObligations(groupId)
  const [editing, setEditing] = useState<string | null>(null)
  const [paidStr, setPaidStr] = useState('')

  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? '—'
  const rows = members
    .filter((m) => m.status === 'active' || m.userId)
    .map((m) => cycle.contributions.find((c) => c.memberId === m.id) ?? { id: m.id, memberId: m.id, requiredAmount: 0, paidAmount: 0, status: 'pending' as const })

  const savePaid = (memberId: string) => {
    upsert.mutate(
      { cycleId: cycle.id, data: { memberId, paidAmount: paidStr ? toPaise(paidStr) : 0 } },
      { onSuccess: () => setEditing(null) },
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-200">Contributions</h3>
        <button
          onClick={() => recompute.mutate(cycle.id)}
          disabled={recompute.isPending}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', recompute.isPending && 'animate-spin')} /> Recompute shares
        </button>
      </div>
      <div className="space-y-1.5">
        {rows.map((c) => (
          <div key={c.memberId} className="flex items-center gap-2.5 text-sm">
            <span className="flex-1 text-zinc-200 truncate">{nameOf(c.memberId)}</span>
            <span className="text-xs text-zinc-500 tabular-nums">
              <CurrencyDisplay amount={c.paidAmount} size="xs" muted /> / <CurrencyDisplay amount={c.requiredAmount} size="xs" muted />
            </span>
            {editing === c.memberId ? (
              <input
                autoFocus
                value={paidStr}
                onChange={(e) => setPaidStr(e.target.value)}
                onBlur={() => savePaid(c.memberId)}
                onKeyDown={(e) => e.key === 'Enter' && savePaid(c.memberId)}
                inputMode="decimal"
                placeholder="paid ₹"
                className="w-20 h-7 px-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs text-right tabular-nums focus:outline-none focus:border-emerald-500/50"
              />
            ) : (
              <button
                onClick={() => {
                  setEditing(c.memberId)
                  setPaidStr(String(c.paidAmount / 100))
                }}
                className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', STATUS_STYLE[c.status] ?? STATUS_STYLE.pending)}
              >
                {c.status}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
