'use client'
import { Lightbulb, ArrowLeftRight, Rocket } from 'lucide-react'
import { InsightCard } from '@/components/domain/insights/InsightCard'
import { useInsights } from '@/lib/queries'
import { useGoalRecommendations } from '@/lib/queries/goals'
import type { Insight } from '@/lib/engines/insight-engine'
import { RecentTransactions } from '@/components/domain/transactions/RecentTransactions'
import { Skeleton } from '@/components/shared/Skeletons'

interface DashboardInsightZoneProps { month: string }

export function DashboardInsightZone({ month }: DashboardInsightZoneProps) {
  const { data: insights, isLoading, isError } = useInsights(month)
  const { data: goalRecs } = useGoalRecommendations()

  // Goal-aware AI recommendations, reshaped into the dashboard Insight shape and
  // appended after the transaction/budget insights (reuses the cached query — no extra Gemini call).
  const goalInsights: Insight[] = (goalRecs?.recommendations ?? []).map((r) => ({
    id: `goal-${r.id}`,
    title: r.title,
    body: r.body,
    severity:
      r.category === 'risk' || r.impact === 'high'
        ? 'warning'
        : r.impact === 'medium'
          ? 'info'
          : 'tip',
    actionLabel: 'View goals',
    actionHref: '/goals',
  }))

  return (
    <div className="space-y-4">
      {/* Insights */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-600/40 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-200">AI Insights</h2>
        </div>

        {isLoading && !isError ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : isError ? (
          <p className="text-xs text-zinc-600 py-4 text-center">
            Couldn&apos;t load insights right now.
          </p>
        ) : !insights?.length && !goalInsights.length ? (
          <p className="text-xs text-zinc-600 py-4 text-center">
            Add more transactions to see insights.
          </p>
        ) : (
          <div className="space-y-2">
            {(insights ?? []).map((insight: any, i: number) => (
              <InsightCard key={insight.id} insight={insight} index={i} />
            ))}

            {goalInsights.length > 0 && (
              <>
                <div className="flex items-center gap-2 pt-3 pb-1">
                  <Rocket className="w-3 h-3 text-emerald-400" />
                  <span className="text-[11px] uppercase tracking-wide text-zinc-600">From your goals</span>
                </div>
                {goalInsights.map((insight, i) => (
                  <InsightCard key={insight.id} insight={insight} index={(insights?.length ?? 0) + i} />
                ))}
              </>
            )}
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
