'use client'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { usePrediction } from '@/lib/queries'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { cn } from '@/lib/utils/cn'

const WARNING_STYLES = {
  healthy: { bg: 'bg-emerald-950/30 border-emerald-800/30', text: 'text-emerald-400', label: 'On track' },
  tight:   { bg: 'bg-amber-950/20 border-amber-800/30',    text: 'text-amber-400',   label: 'Running tight' },
  deficit: { bg: 'bg-red-950/20 border-red-800/30',        text: 'text-red-400',     label: 'Projected deficit' },
}

export function PredictionCard({ month }: { month: string }) {
  const { data, isLoading } = usePrediction(month)

  if (isLoading) return <div className="skeleton h-24 rounded-2xl" />
  if (!data) return null

  const style = WARNING_STYLES[data.warningLevel as keyof typeof WARNING_STYLES] ?? WARNING_STYLES.healthy

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={cn('rounded-2xl border p-4', style.bg)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className={cn('w-3.5 h-3.5', style.text)} />
          <span className="text-xs font-medium text-zinc-400">Month-end prediction</span>
          <span className={cn('text-xs', style.text)}>· {style.label}</span>
        </div>
        <span className="text-xs text-zinc-600">{data.daysRemaining}d remaining</span>
      </div>
      <div className="flex items-baseline gap-2">
        <CurrencyDisplay
          amount={Math.abs(data.projectedBalance)}
          size="lg"
          colorCoded
          showSign={data.projectedBalance < 0}
        />
        <span className="text-xs text-zinc-500">projected {data.projectedBalance >= 0 ? 'surplus' : 'deficit'}</span>
      </div>
      {data.confidence === 'low' && (
        <p className="text-xs text-zinc-600 mt-1">Low confidence — less than 10 days of data</p>
      )}
    </motion.div>
  )
}
