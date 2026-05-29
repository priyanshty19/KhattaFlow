'use client'
import { Receipt, Trash2 } from 'lucide-react'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { useDeleteExpense, type SplitExpenseDTO, type SplitMemberDTO } from '@/lib/queries/split'
import { formatDate } from '@/lib/utils/date'
import { getSplitCategoryMeta, type SplitGroupType } from '@/constants/split-categories'

const SPLIT_LABEL: Record<string, string> = { equal: 'Equal', exact: 'Exact', percentage: '%', shares: 'Shares' }

export function ActivityFeed({
  groupId,
  groupType,
  expenses,
  members,
}: {
  groupId: string
  groupType: SplitGroupType
  expenses: SplitExpenseDTO[]
  members: SplitMemberDTO[]
}) {
  const del = useDeleteExpense(groupId)
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? '—'

  if (!expenses.length) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
        <Receipt className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
        <p className="text-sm text-zinc-500">No expenses yet. Add the first one.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800/60">
      {expenses.map((e) => {
        const cat = e.category ? getSplitCategoryMeta(groupType, e.category) : null
        return (
          <div key={e.id} className="flex items-center gap-3 p-3.5 group">
            <span className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4 text-zinc-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-100 truncate">{e.description}</p>
              <p className="text-xs text-zinc-500">
                {e.paidByName} paid · {formatDate(e.date)} · {SPLIT_LABEL[e.splitType] ?? e.splitType}
                {cat && <span className="ml-1" style={{ color: cat.color }}>· {cat.label}</span>}
              </p>
            </div>
            <CurrencyDisplay amount={e.amount} size="sm" className="text-zinc-200 shrink-0" />
            <button
              onClick={() => del.mutate(e.id)}
              disabled={del.isPending}
              className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-rose-400 hover:bg-zinc-800 transition-all shrink-0"
              aria-label="Delete expense"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
