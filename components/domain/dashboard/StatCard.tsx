'use client'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'

interface StatCardProps {
  label: string
  amount: number
  subtext?: string
  trend?: { direction: 'up' | 'down' | 'neutral'; percentage: number }
  highlight?: boolean
  warning?: boolean
  icon?: LucideIcon
  index?: number
}

export function StatCard({ label, amount, subtext, trend, highlight, warning, icon: Icon, index = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06, ease: 'easeOut' }}
      className="bg-zinc-900 border border-zinc-600/40 rounded-xl px-4 py-3.5 hover:border-zinc-500/50 hover:bg-zinc-800/50 transition-all duration-200"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{label}</span>
        {Icon && (
          <div className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center',
            highlight ? 'bg-emerald-500/15' : warning ? 'bg-red-500/15' : 'bg-zinc-800'
          )}>
            <Icon className={cn(
              'w-3.5 h-3.5',
              highlight ? 'text-emerald-400' : warning ? 'text-red-400' : 'text-zinc-400'
            )} />
          </div>
        )}
      </div>

      <CurrencyDisplay
        amount={amount}
        size="xl"
        colorCoded={warning || highlight}
        className="block mb-1"
      />

      <div className="flex items-center gap-2">
        {subtext && <span className="text-xs text-zinc-500">{subtext}</span>}
        {trend && (
          <span className={cn(
            'flex items-center gap-0.5 text-xs font-medium',
            trend.direction === 'up' ? 'text-emerald-400' : trend.direction === 'down' ? 'text-red-400' : 'text-zinc-500'
          )}>
            {trend.direction === 'up' ? <TrendingUp className="w-3 h-3" /> : trend.direction === 'down' ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {Math.abs(trend.percentage).toFixed(1)}%
          </span>
        )}
      </div>
    </motion.div>
  )
}
