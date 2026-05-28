'use client'
import Link from 'next/link'
import { useTransactions } from '@/lib/queries/transactions'
import { TransactionCard } from './TransactionCard'
import { Skeleton } from '@/components/shared/Skeletons'

export function RecentTransactions({ month, limit = 6 }: { month: string; limit?: number }) {
  const { data, isLoading } = useTransactions({ month, limit: String(limit) })

  if (isLoading) return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
    </div>
  )

  const items = data?.items ?? []

  if (!items.length) return (
    <p className="text-xs text-zinc-600 py-4 text-center">No transactions yet this month.</p>
  )

  return (
    <div className="space-y-1.5">
      {items.map((t: any, i: number) => (
        <TransactionCard key={t.id} transaction={t} index={i} compact />
      ))}
      {data?.total > limit && (
        <Link
          href="/transactions"
          className="block text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors pt-2"
        >
          View all {data.total} transactions →
        </Link>
      )}
    </div>
  )
}
