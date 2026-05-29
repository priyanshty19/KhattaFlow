'use client'
import { Sparkles, TrendingUp, Wallet, Target, ShieldAlert, Lightbulb, RefreshCw } from 'lucide-react'
import { useGoalRecommendations, type GoalRecommendation } from '@/lib/queries/goals'
import { cn } from '@/lib/utils/cn'

const CATEGORY_META: Record<
  GoalRecommendation['category'],
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  contribution: { icon: Wallet, color: 'text-emerald-400' },
  allocation: { icon: TrendingUp, color: 'text-sky-400' },
  goal: { icon: Target, color: 'text-violet-400' },
  risk: { icon: ShieldAlert, color: 'text-amber-400' },
  tip: { icon: Lightbulb, color: 'text-zinc-400' },
}

const IMPACT_BADGE: Record<GoalRecommendation['impact'], string> = {
  high: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  medium: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  low: 'text-zinc-400 bg-zinc-800/60 border-zinc-700/40',
}

export function AIRecommendations() {
  const { data, isLoading, isError, isFetching, refetch } = useGoalRecommendations()

  return (
    <div className="bg-gradient-to-b from-zinc-900 to-zinc-900/60 border border-emerald-500/15 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-500/15">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          </span>
          <h3 className="text-sm font-semibold text-zinc-100">AI recommendations</h3>
          {data?.source === 'rules' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">offline</span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3 h-3', isFetching && 'animate-spin')} />
          Refresh
        </button>
      </div>
      <p className="text-xs text-zinc-600 mb-4">Top moves across your goals and mix, personalized by AI.</p>

      {isLoading ? (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-zinc-800/40 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-xs text-zinc-500 py-4">Couldn't generate recommendations right now. Try refreshing.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {data?.recommendations.map((r, i) => {
            const meta = CATEGORY_META[r.category] ?? CATEGORY_META.tip
            const Icon = meta.icon
            return (
              <div
                key={r.id || i}
                className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3.5 py-3"
              >
                <span className="mt-0.5 flex items-center justify-center w-6 h-6 rounded-lg bg-zinc-800/70 shrink-0">
                  <Icon className={cn('w-3.5 h-3.5', meta.color)} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-zinc-200">{r.title}</span>
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase', IMPACT_BADGE[r.impact])}>
                      {r.impact}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{r.body}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
