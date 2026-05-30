'use client'
import Link from 'next/link'
import { Rocket, ArrowRight } from 'lucide-react'
import { useGoalPlan } from '@/lib/queries/goals'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils/cn'

const STATUS_META: Record<string, { label: string; bar: string; text: string }> = {
  on_track: { label: 'On track', bar: 'bg-emerald-500', text: 'text-emerald-400' },
  ahead:    { label: 'Ahead',    bar: 'bg-emerald-500', text: 'text-emerald-400' },
  behind:   { label: 'Behind',   bar: 'bg-amber-500',   text: 'text-amber-400' },
}

export function DashboardGoalBand() {
  const { data, isLoading } = useGoalPlan()

  if (isLoading) return <div className="skeleton h-56 rounded-2xl" />

  const goals = data?.goals ?? []
  const onTrack = data?.summary?.onTrack ?? 0
  const total = data?.summary?.goalsTotal ?? 0

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-600/40 p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center">
            <Rocket className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Goals</h2>
            {total > 0 && (
              <p className="text-xs text-zinc-500 mt-0.5">
                On track for <span className="text-emerald-400 font-medium">{onTrack} of {total}</span>
              </p>
            )}
          </div>
        </div>
        <Link href="/goals" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors inline-flex items-center gap-1">
          View <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="No goals yet"
          description="Set a target and see if your investments will get you there."
          className="py-6"
        />
      ) : (
        <div className="space-y-3.5">
          {goals.slice(0, 3).map((g) => {
            const pct = g.target > 0 ? Math.min(100, Math.round((g.projected / g.target) * 100)) : 0
            const meta = STATUS_META[g.status] ?? STATUS_META.behind
            return (
              <div key={g.goalId ?? g.name}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-sm text-zinc-300 truncate">{g.name}</span>
                  <span className={cn('text-[11px] font-medium shrink-0', meta.text)}>{meta.label}</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all', meta.bar)} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <CurrencyDisplay amount={g.projected} size="xs" compact className="text-zinc-500" />
                  <span className="text-[10px] text-zinc-600 tabular-nums">{pct}% of <CurrencyDisplay amount={g.target} size="xs" compact className="text-zinc-500" /></span>
                </div>
              </div>
            )
          })}
          {goals.length > 3 && (
            <Link href="/goals" className="block text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">
              +{goals.length - 3} more {goals.length - 3 === 1 ? 'goal' : 'goals'}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
