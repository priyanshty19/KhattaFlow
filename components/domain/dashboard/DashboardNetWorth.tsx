'use client'
import { motion } from 'framer-motion'
import { Landmark, TrendingUp, PiggyBank } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts'
import Link from 'next/link'
import { useNetWorth } from '@/lib/queries'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { cn } from '@/lib/utils/cn'

// Net Worth proxy (v1): invested corpus + cumulative net savings. This is the
// dashboard's headline differentiator — it sits above the fold so the first thing
// the user sees is their wealth trajectory, not last month's spend.
export function DashboardNetWorth() {
  const { data, isLoading } = useNetWorth()

  if (isLoading) {
    return <div className="skeleton h-44 rounded-2xl" />
  }

  const netWorth = data?.netWorth ?? 0
  const investedCorpus = data?.investedCorpus ?? 0
  const cumulativeSavings = data?.cumulativeSavings ?? 0
  const series = data?.series ?? []
  const hasData = (data?.monthsTracked ?? 0) > 0 || investedCorpus > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-zinc-900 to-zinc-900 border border-emerald-500/20 rounded-2xl p-5 md:p-6"
    >
      <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Landmark className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-[11px] font-semibold text-emerald-400/80 uppercase tracking-wider">Net Worth</span>
          </div>
          <CurrencyDisplay amount={netWorth} size="2xl" colorCoded={netWorth < 0} className="block" />
          <p className="text-xs text-zinc-500 mt-1">
            {hasData ? 'Invested corpus + cumulative net savings' : 'Add investments & track months to build this'}
          </p>

          {/* Breakdown chips */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Link
              href="/goals"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/70 hover:bg-zinc-800 border border-zinc-700/50 transition-colors"
            >
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span className="text-[11px] text-zinc-400">Invested</span>
              <CurrencyDisplay amount={investedCorpus} size="xs" compact className="text-zinc-200 font-medium" />
            </Link>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/70 border border-zinc-700/50">
              <PiggyBank className="w-3 h-3 text-emerald-400" />
              <span className="text-[11px] text-zinc-400">Saved</span>
              <CurrencyDisplay amount={cumulativeSavings} size="xs" compact colorCoded={cumulativeSavings < 0} className="font-medium" />
            </span>
          </div>
        </div>

        {/* Sparkline */}
        {series.length > 1 && (
          <div className="w-full md:w-48 h-16 md:h-20 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="nwGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={['dataMin', 'dataMax']} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#nwGradient)"
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </motion.div>
  )
}
