'use client'
import { ALL_REWARD_CATEGORIES, type RewardCategory } from '@/lib/utils/category-mapper'
import { cn } from '@/lib/utils/cn'

interface SpendAdjusterProps {
  spendDistribution: Record<string, number>
  onChange: (dist: Record<string, number>) => void
  spendSource: 'auto' | 'manual' | 'insufficient_data'
  onRefresh: () => void
  loading: boolean
  monthlyIncome: number   // ← new: income drives slider max
}

const CATEGORY_ICONS: Record<string, string> = {
  'Dining':               '🍽️',
  'Groceries':            '🛒',
  'Travel':               '✈️',
  'Fuel':                 '⛽',
  'Online Shopping':      '🛍️',
  'Entertainment':        '🎬',
  'Utilities':            '💡',
  'Healthcare':           '🏥',
  'International Spends': '🌍',
}

// ── Helpers ────────────────────────────────────────────────────────────────
const fmtShort = (n: number): string => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`
  if (n >= 1000)   return `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
  return `₹${n}`
}

const fmtFull = (n: number): string => '₹' + Math.round(n).toLocaleString('en-IN')

function getStep(income: number): number {
  if (income <= 50000)  return 500
  if (income <= 100000) return 1000
  if (income <= 200000) return 2000
  return 5000
}

export function SpendAdjuster({
  spendDistribution, onChange, spendSource, onRefresh, loading, monthlyIncome,
}: SpendAdjusterProps) {
  const activeCategories = Object.keys(spendDistribution)

  // Use income as the ceiling; fall back to 100k if not set yet
  const sliderMax  = Math.max(monthlyIncome || 100000, 100000)
  const step       = getStep(sliderMax)
  const total      = Object.values(spendDistribution).reduce((a, b) => a + b, 0)
  const pct        = sliderMax > 0 ? Math.min((total / sliderMax) * 100, 100) : 0
  const remaining  = sliderMax - total
  const isOver     = total > sliderMax

  const toggleCategory = (cat: RewardCategory) => {
    if (activeCategories.includes(cat)) {
      const next = { ...spendDistribution }
      delete next[cat]
      onChange(next)
    } else {
      // Default new category to 10% of income (rounded to nearest step), capped at remaining
      const defaultVal = Math.min(
        Math.round((sliderMax * 0.10) / step) * step,
        Math.max(0, remaining),
        sliderMax,
      )
      onChange({ ...spendDistribution, [cat]: defaultVal })
    }
  }

  const setAmount = (cat: string, raw: number) => {
    // Don't enforce total cap here — let user go over and show a warning instead
    onChange({ ...spendDistribution, [cat]: raw })
  }

  // Tick labels: 0 / 25% / 50% / 75% / max
  const ticks = [0, sliderMax * 0.25, sliderMax * 0.5, sliderMax * 0.75, sliderMax]

  return (
    <div className="space-y-5">
      {/* Source badge + refresh */}
      <div className="flex items-center justify-between">
        {spendSource === 'auto' ? (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Based on your last 3 months of transactions
          </span>
        ) : (
          <span className="text-xs text-zinc-500">Enter your monthly spend per category</span>
        )}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          {loading ? (
            <span className="w-3 h-3 border border-zinc-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>↻</span>
          )}
          Refresh
        </button>
      </div>

      {/* Category toggles */}
      <div>
        <p className="text-xs text-zinc-500 mb-2 font-medium">Select spending categories</p>
        <div className="flex flex-wrap gap-2">
          {ALL_REWARD_CATEGORIES.map(cat => {
            const active = activeCategories.includes(cat)
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150',
                  active
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                    : 'bg-zinc-800/60 border-zinc-700/40 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                )}
              >
                <span>{CATEGORY_ICONS[cat] ?? '•'}</span>
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      {/* Sliders */}
      {activeCategories.length > 0 && (
        <div className="space-y-4">
          {activeCategories.map(cat => {
            const amount = spendDistribution[cat] ?? 0
            return (
              <div key={cat} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-300 flex items-center gap-1.5">
                    <span>{CATEGORY_ICONS[cat] ?? '•'}</span>
                    {cat}
                  </span>
                  <span className="text-xs font-semibold text-emerald-400 tabular-nums">
                    {fmtFull(amount)}/mo
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={sliderMax}
                  step={step}
                  value={Math.min(amount, sliderMax)}
                  onChange={e => setAmount(cat, Number(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 cursor-pointer"
                />
                {/* Dynamic tick labels */}
                <div className="flex justify-between text-[10px] text-zinc-700">
                  {ticks.map((v, i) => (
                    <span key={i}>{fmtShort(v)}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Budget allocation bar */}
      {activeCategories.length > 0 && (
        <div className="space-y-2">
          {/* Progress bar */}
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                isOver ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
              )}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Total row */}
          <div className={cn(
            'rounded-lg px-4 py-3 flex items-center justify-between border',
            isOver
              ? 'bg-red-500/5 border-red-500/20'
              : 'bg-zinc-800/50 border-zinc-700/40'
          )}>
            <div>
              <span className="text-xs text-zinc-400">Estimated monthly spend</span>
              {isOver ? (
                <span className="block text-[10px] text-red-400 font-medium">
                  Over income by {fmtFull(total - sliderMax)}
                </span>
              ) : (
                <span className="block text-[10px] text-zinc-600">
                  {fmtFull(remaining)} remaining of {fmtFull(sliderMax)} income
                </span>
              )}
            </div>
            <span className={cn(
              'text-sm font-bold tabular-nums',
              isOver ? 'text-red-400' : 'text-zinc-100'
            )}>
              {fmtFull(total)}
            </span>
          </div>
        </div>
      )}

      {activeCategories.length === 0 && (
        <p className="text-xs text-zinc-600 text-center py-4">
          Select at least one category above to continue.
        </p>
      )}
    </div>
  )
}
