'use client'
import { ArrowUpRight, ArrowDownRight, Check, BarChart3 } from 'lucide-react'
import { VEHICLES, type Vehicle } from '@/constants/investment-returns'
import { formatINR } from '@/lib/utils/currency'
import { cn } from '@/lib/utils/cn'

interface Suggestion {
  vehicle: string
  action: 'increase' | 'decrease' | 'maintain'
  currentShare: number
  targetShare: number
  deltaMonthly: number
  reason: string
}

const ACTION_META = {
  increase: { icon: ArrowUpRight, label: 'Increase', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  decrease: { icon: ArrowDownRight, label: 'Reduce', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  maintain: { icon: Check, label: 'Maintain', cls: 'text-zinc-400 bg-zinc-800/60 border-zinc-700/40' },
} as const

export function AllocationOptimizer({ suggestions, style }: { suggestions: Suggestion[]; style?: string }) {
  if (!suggestions.length) return null
  const actionable = suggestions.filter((s) => s.action !== 'maintain')

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-sky-500/15">
          <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
        </span>
        <h3 className="text-sm font-semibold text-zinc-200">Data &amp; ROI: mix alignment</h3>
      </div>
      <p className="text-xs text-zinc-600 mb-4">
        {actionable.length
          ? `${actionable.length} math-based move${actionable.length > 1 ? 's' : ''} to align your monthly mix with a ${style ?? ''} target allocation.`
          : `Your monthly mix is well aligned with a ${style ?? ''} target allocation.`}
      </p>

      <div className="flex flex-col gap-2.5">
        {suggestions.map((s) => {
          const meta = VEHICLES[s.vehicle as Vehicle]
          const action = ACTION_META[s.action]
          const Icon = action.icon
          return (
            <div
              key={`${s.vehicle}-${s.action}`}
              className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3.5 py-3"
            >
              <span
                className="mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: meta?.color ?? '#94A3B8' }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-zinc-200">{meta?.label ?? s.vehicle}</span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border',
                      action.cls,
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {action.label}
                  </span>
                  {s.action !== 'maintain' && s.deltaMonthly !== 0 && (
                    <span className={cn('text-xs font-semibold tabular-nums', s.deltaMonthly > 0 ? 'text-emerald-400' : 'text-amber-400')}>
                      {s.deltaMonthly > 0 ? '+' : '−'}
                      {formatINR(Math.abs(s.deltaMonthly))}/mo
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{s.reason}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-600 tabular-nums">
                  <span>Now {(s.currentShare * 100).toFixed(0)}%</span>
                  <span>→</span>
                  <span>Target {(s.targetShare * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
