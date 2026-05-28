'use client'
import { useTransactions } from '@/lib/queries/transactions'
import { TransactionCard } from './TransactionCard'
import { TransactionListSkeleton } from '@/components/shared/Skeletons'
import { EmptyState } from '@/components/shared/EmptyState'
import { ArrowLeftRight } from 'lucide-react'
import { useUIStore } from '@/stores/ui.store'
import { toRupees } from '@/lib/utils/currency'
import { cn } from '@/lib/utils/cn'

interface TransactionListProps {
  month: string
  filter: { type?: string; categoryId?: string; paymentMethod?: string; search?: string }
}

function groupByDate(items: any[]): [string, any[]][] {
  const map = new Map<string, any[]>()
  for (const item of items) {
    const key = item.date.slice(0, 10)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries())
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).toUpperCase()
}

export function TransactionList({ month, filter }: TransactionListProps) {
  const params = {
    month,
    ...(filter.type && { type: filter.type }),
    ...(filter.categoryId && { categoryId: filter.categoryId }),
    ...(filter.paymentMethod && { paymentMethod: filter.paymentMethod }),
    ...(filter.search && { search: filter.search }),
    limit: '100',
  }
  const { data, isLoading } = useTransactions(params)
  const openQuickAdd = useUIStore(s => s.openQuickAdd)

  if (isLoading) return <TransactionListSkeleton />

  const items: any[] = data?.items ?? []

  if (!items.length) return (
    <EmptyState
      icon={ArrowLeftRight}
      title="No transactions found"
      description="Add your first transaction for this month."
      action={{ label: '+ Add transaction', onClick: () => openQuickAdd() }}
    />
  )

  const groups = groupByDate(items)

  const totalIncome = items.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0)
  const totalExpenses = items.filter((t: any) => t.type !== 'income').reduce((s: number, t: any) => s + t.amount, 0)
  const netChange = totalIncome - totalExpenses

  return (
    <div className="space-y-1">
      {groups.map(([date, txns]) => (
        <div key={date}>
          <p className="text-[10px] font-semibold text-zinc-500 tracking-widest px-1 pt-4 pb-2">
            {formatDateHeader(date)}
          </p>
          <div className="bg-zinc-900 border border-zinc-600/40 rounded-xl overflow-hidden divide-y divide-zinc-800/50">
            {txns.map((t: any, i: number) => (
              <TransactionCard key={t.id} transaction={t} index={i} grouped />
            ))}
          </div>
        </div>
      ))}

      {/* Footer summary */}
      <div className="grid grid-cols-3 gap-4 pt-5">
        <div className="bg-zinc-900 border border-zinc-600/40 rounded-xl p-4">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Total Expenses</p>
          <p className="text-lg font-bold text-zinc-200 tabular-nums">
            ₹{toRupees(totalExpenses).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-600/40 rounded-xl p-4">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Total Income</p>
          <p className="text-lg font-bold text-emerald-400 tabular-nums">
            ₹{toRupees(totalIncome).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-600/40 rounded-xl p-4">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Net Change</p>
          <p className={cn('text-lg font-bold tabular-nums', netChange >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {netChange >= 0 ? '+' : '−'}₹{toRupees(Math.abs(netChange)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </div>
  )
}
