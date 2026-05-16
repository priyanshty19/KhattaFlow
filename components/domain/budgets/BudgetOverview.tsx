'use client'
import { motion } from 'framer-motion'
import { BudgetBar } from './BudgetBar'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import type { BudgetStatus } from '@/lib/engines/budget-engine'
import { cn } from '@/lib/utils/cn'

interface BudgetOverviewProps {
  month: string
  statuses: BudgetStatus[]
}

export function BudgetOverview({ month, statuses }: BudgetOverviewProps) {
  const totalBudgeted = statuses.reduce((s, b) => s + b.budgeted, 0)
  const totalSpent = statuses.reduce((s, b) => s + b.spent, 0)
  const overCount = statuses.filter(s => s.status === 'over').length
  const overall = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Budgeted', amount: totalBudgeted, color: 'text-zinc-300' },
          { label: 'Spent',    amount: totalSpent,    color: totalSpent > totalBudgeted ? 'text-red-400' : 'text-zinc-300' },
          { label: 'Remaining', amount: totalBudgeted - totalSpent, color: totalBudgeted - totalSpent >= 0 ? 'text-emerald-400' : 'text-red-400' },
        ].map(({ label, amount, color }) => (
          <div key={label} className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
            <p className="text-xs text-zinc-500 mb-2">{label}</p>
            <CurrencyDisplay amount={Math.abs(amount)} size="lg" className={color} />
          </div>
        ))}
      </div>

      {/* Overall bar */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-zinc-400">Overall utilization</span>
          <span className={cn(
            'text-sm font-semibold tabular-nums',
            overall >= 100 ? 'text-red-400' : overall >= 80 ? 'text-amber-400' : 'text-emerald-400'
          )}>
            {overall.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(overall, 100)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={cn(
              'h-full rounded-full',
              overall >= 100 ? 'bg-red-500' : overall >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
            )}
          />
        </div>
        {overCount > 0 && (
          <p className="text-xs text-red-400 mt-2">{overCount} categor{overCount > 1 ? 'ies are' : 'y is'} over budget</p>
        )}
      </div>

      {/* Per-category bars */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 space-y-5">
        <h3 className="text-sm font-medium text-zinc-300">By Category</h3>
        {statuses.map((status, i) => (
          <BudgetBar key={status.categoryId} status={status} index={i} />
        ))}
      </div>
    </div>
  )
}
