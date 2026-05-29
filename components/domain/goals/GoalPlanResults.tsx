'use client'
import { useState } from 'react'
import { Target, Wallet, TrendingUp, PiggyBank } from 'lucide-react'
import { formatINR } from '@/lib/utils/currency'
import { cn } from '@/lib/utils/cn'
import { GoalCard } from './GoalCard'
import { ProjectionChart } from './ProjectionChart'
import { AllocationOptimizer } from './AllocationOptimizer'
import { AIRecommendations } from './AIRecommendations'
import type { GoalPlanResponse } from '@/lib/queries/goals'

interface GoalPlanResultsProps {
  plan: GoalPlanResponse
  onEditGoal?: (goalId: string) => void
  onDeleteGoal?: (goalId: string) => void
}

export function GoalPlanResults({ plan, onEditGoal, onDeleteGoal }: GoalPlanResultsProps) {
  const { summary, goals, suggestions, style } = plan
  const [selectedId, setSelectedId] = useState<string | null>(goals[0]?.goalId ?? null)
  const selected = goals.find((g) => g.goalId === selectedId) ?? null

  const headline =
    summary.goalsTotal === 0
      ? 'Add a goal to see your plan'
      : `On track for ${summary.onTrack} of ${summary.goalsTotal} goal${summary.goalsTotal > 1 ? 's' : ''}`

  return (
    <div className="flex flex-col gap-5">
      {/* Headline */}
      <div>
        <h2 className="text-lg md:text-xl font-semibold text-zinc-100">{headline}</h2>
        <p className="text-sm text-zinc-400 mt-0.5">
          Based on your current investments compounding at {(summary.blendedReturn * 100).toFixed(1)}% a year.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryStat icon={Wallet} label="Monthly investing" value={formatINR(summary.monthlyInvesting)} />
        <SummaryStat icon={PiggyBank} label="Existing corpus" value={formatINR(summary.existingCorpus)} />
        <SummaryStat icon={TrendingUp} label="Blended return" value={`${(summary.blendedReturn * 100).toFixed(1)}%`} accent />
        <SummaryStat icon={Target} label="Goals on track" value={`${summary.onTrack} / ${summary.goalsTotal}`} />
      </div>

      {/* Goal cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {goals.map((g) => (
          <GoalCard
            key={g.goalId ?? g.name}
            goal={g}
            selected={selectedId === g.goalId}
            onSelect={() => setSelectedId(selectedId === g.goalId ? null : (g.goalId ?? null))}
            onEdit={g.goalId && onEditGoal ? () => onEditGoal(g.goalId!) : undefined}
            onDelete={g.goalId && onDeleteGoal ? () => onDeleteGoal(g.goalId!) : undefined}
          />
        ))}
      </div>

      {/* Selected goal chart */}
      {selected && (
        <ProjectionChart series={selected.series} target={selected.target} status={selected.status} />
      )}

      {/* Two recommendation segments: deterministic ROI math + goal-aware AI */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        <AllocationOptimizer suggestions={suggestions} style={style} />
        <AIRecommendations />
      </div>
    </div>
  )
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-[11px] uppercase tracking-wide text-zinc-600">{label}</span>
      </div>
      <p className={cn('text-lg font-bold tabular-nums', accent ? 'text-emerald-400' : 'text-zinc-100')}>{value}</p>
    </div>
  )
}
