'use client'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import type { BudgetStatus } from '@/lib/engines/budget-engine'

interface BudgetBarProps {
  status: BudgetStatus
  index?: number
}

const STATUS_COLORS = {
  safe:    'bg-emerald-500',
  warning: 'bg-amber-500',
  over:    'bg-red-500',
}

const STATUS_TEXT = {
  safe:    'text-emerald-400',
  warning: 'text-amber-400',
  over:    'text-red-400',
}

export function BudgetBar({ status, index = 0 }: BudgetBarProps) {
  const pct = Math.min(status.percentage, 100)
  const overPct = status.percentage > 100 ? Math.min((status.percentage - 100) / 100 * 30, 30) : 0

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: status.categoryColor }}
          />
          <span className="text-sm text-zinc-300 font-medium">{status.categoryName}</span>
          {status.isFixed && (
            <span className="text-xs text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">Fixed</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-right">
          <CurrencyDisplay amount={status.spent} size="sm" muted />
          <span className="text-zinc-700 text-xs">/</span>
          <CurrencyDisplay amount={status.budgeted} size="sm" muted />
          <span className={cn('text-xs font-medium tabular-nums w-12 text-right', STATUS_TEXT[status.status])}>
            {status.percentage.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, delay: index * 0.05 + 0.1, ease: 'easeOut' }}
          className={cn('absolute left-0 top-0 h-full rounded-full', STATUS_COLORS[status.status])}
        />
        {/* Over-budget overflow indicator */}
        {overPct > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${overPct}%` }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="absolute right-0 top-0 h-full rounded-full bg-red-700 opacity-50"
          />
        )}
      </div>
    </motion.div>
  )
}
