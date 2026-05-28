'use client'
import { Lightbulb, ArrowLeftRight } from 'lucide-react'
import { InsightCard } from '@/components/domain/insights/InsightCard'
import { useInsights } from '@/lib/queries'
import { RecentTransactions } from '@/components/domain/transactions/RecentTransactions'
import { Skeleton } from '@/components/shared/Skeletons'

interface DashboardInsightZoneProps { month: string }

export function DashboardInsightZone({ month }: DashboardInsightZoneProps) {
  const { data: insights, isLoading } = useInsights(month)

  return (
    <div className="space-y-4">
      {/* Insights */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-600/40 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-200">AI Insights</h2>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : !insights?.length ? (
          <p className="text-xs text-zinc-600 py-4 text-center">
            Add more transactions to see insights.
          </p>
        ) : (
          <div className="space-y-2">
            {insights.map((insight: any, i: number) => (
              <InsightCard key={insight.id} insight={insight} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-600/40 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-200">Recent</h2>
          </div>
        </div>
        <RecentTransactions month={month} limit={6} />
      </div>
    </div>
  )
}
