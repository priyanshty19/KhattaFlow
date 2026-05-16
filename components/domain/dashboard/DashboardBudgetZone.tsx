'use client'
import { Target, TrendingUp } from 'lucide-react'
import { BudgetBar } from '@/components/domain/budgets/BudgetBar'
import { PredictionCard } from './PredictionCard'
import { useBudgetStatus, usePrediction } from '@/lib/queries'
import { EmptyState } from '@/components/shared/EmptyState'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

interface DashboardBudgetZoneProps { month: string }

export function DashboardBudgetZone({ month }: DashboardBudgetZoneProps) {
  const { data, isLoading } = useBudgetStatus(month)
  const router = useRouter()

  if (isLoading) return <div className="skeleton h-72 rounded-2xl" />

  const statuses = data?.statuses ?? []
  const overall = data?.overall ?? 0

  const overallColor = overall >= 100 ? 'text-red-400' : overall >= 80 ? 'text-amber-400' : 'text-emerald-400'
  const overCount = statuses.filter((s: any) => s.status === 'over').length
  const warnCount = statuses.filter((s: any) => s.status === 'warning').length

  return (
    <div className="space-y-4">
      {/* Budget health card */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-600/40 p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center">
              <Target className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">Budget Health</h2>
              {statuses.length > 0 && (
                <p className="text-xs text-zinc-500 mt-0.5">
                  {overCount > 0 && <span className="text-red-400">{overCount} over · </span>}
                  {warnCount > 0 && <span className="text-amber-400">{warnCount} near limit · </span>}
                  <span className={overallColor}>{overall.toFixed(0)}% overall</span>
                </p>
              )}
            </div>
          </div>
          <Link
            href="/budgets"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Manage →
          </Link>
        </div>

        {statuses.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No budgets set"
            description="Set monthly limits per category to track spending health."
            action={{ label: 'Set up budget', onClick: () => router.push('/budgets') }}
            className="py-8"
          />
        ) : (
          <div className="space-y-4">
            {statuses.slice(0, 8).map((status: any, i: number) => (
              <BudgetBar key={status.categoryId} status={status} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Prediction */}
      <PredictionCard month={month} />
    </div>
  )
}
