'use client'
import { TrendingUp, TrendingDown, CheckCircle2, Pencil, Trash2, ChevronDown } from 'lucide-react'
import { formatINR } from '@/lib/utils/currency'
import { cn } from '@/lib/utils/cn'
import type { GoalPlanResponse } from '@/lib/queries/goals'

type PlanGoal = GoalPlanResponse['goals'][number]

const STATUS_META = {
  ahead: { label: 'Ahead', icon: TrendingUp, cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', bar: 'bg-emerald-500' },
  on_track: { label: 'On track', icon: CheckCircle2, cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', bar: 'bg-emerald-500' },
  behind: { label: 'Behind', icon: TrendingDown, cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20', bar: 'bg-amber-500' },
} as const

function formatTargetDate(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

function horizonLabel(months: number): string {
  const y = Math.floor(months / 12)
  const m = months % 12
  return [y ? `${y}y` : '', m ? `${m}m` : ''].filter(Boolean).join(' ') || '<1m'
}

interface GoalCardProps {
  goal: PlanGoal
  selected?: boolean
  onSelect?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function GoalCard({ goal, selected, onSelect, onEdit, onDelete }: GoalCardProps) {
  const status = STATUS_META[goal.status]
  const Icon = status.icon
  const progress = goal.target > 0 ? Math.min(100, Math.max(0, (goal.projected / goal.target) * 100)) : 0

  return (
    <div
      className={cn(
        'rounded-2xl border bg-zinc-900 p-5 transition-colors',
        selected ? 'border-emerald-500/40' : 'border-zinc-800 hover:border-zinc-700',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-zinc-100 truncate">{goal.name}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {formatINR(goal.target)} by {formatTargetDate(goal.targetDate)} · {horizonLabel(goal.monthsRemaining)} left
          </p>
        </div>
        <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg border shrink-0', status.cls)}>
          <Icon className="w-3.5 h-3.5" />
          {status.label}
        </span>
      </div>

      {/* progress */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-zinc-500">Projected {formatINR(goal.projected)}</span>
          <span className={cn('font-semibold tabular-nums', goal.gapPct >= 0 ? 'text-emerald-400' : 'text-amber-400')}>
            {goal.gapPct >= 0 ? '+' : ''}
            {(goal.gapPct * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', status.bar)} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* metrics */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <Metric label="Investing now" value={`${formatINR(goal.monthlyInvesting)}/mo`} />
        <Metric
          label={goal.shortfallMonthly > 0 ? 'Top-up needed' : 'Required'}
          value={`${formatINR(goal.requiredMonthly)}/mo`}
          accent={goal.shortfallMonthly > 0 ? 'amber' : undefined}
        />
      </div>

      {goal.shortfallMonthly > 0 && (
        <p className="mt-3 text-xs text-amber-400/90 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2">
          Add <span className="font-semibold">{formatINR(goal.shortfallMonthly)}/mo</span> to get on track.
        </p>
      )}

      {/* actions */}
      <div className="flex items-center gap-1 mt-4 pt-3 border-t border-zinc-800">
        {onSelect && (
          <button
            onClick={onSelect}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
              selected ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60',
            )}
          >
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', selected && 'rotate-180')} />
            {selected ? 'Hide chart' : 'View chart'}
          </button>
        )}
        <div className="flex-1" />
        {onEdit && (
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
            aria-label="Edit goal"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            aria-label="Delete goal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: 'amber' }) {
  return (
    <div className="rounded-xl bg-zinc-950/40 border border-zinc-800 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-zinc-600">{label}</p>
      <p className={cn('text-sm font-semibold tabular-nums mt-0.5', accent === 'amber' ? 'text-amber-400' : 'text-zinc-100')}>
        {value}
      </p>
    </div>
  )
}
