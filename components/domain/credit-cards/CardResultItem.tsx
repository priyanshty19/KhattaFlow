'use client'
import { useState } from 'react'
import { ChevronDown, ChevronUp, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { ScoredCard } from '@/lib/engines/credit-card-engine'

const RANK_COLORS: Record<number, string> = {
  1: 'bg-emerald-500 text-zinc-950',
  2: 'bg-zinc-400 text-zinc-950',
  3: 'bg-amber-500 text-zinc-950',
}

interface CardResultItemProps {
  scored: ScoredCard
  rank: number
}

export function CardResultItem({ scored, rank }: CardResultItemProps) {
  const [expanded, setExpanded] = useState(rank === 1)
  const [intentCaptured, setIntentCaptured] = useState(false)
  const { card, envsResult, reasoning, tier, scoreBreakdown } = scored
  const envsPositive = envsResult.envs >= 0
  const fmt = (n: number) => '₹' + Math.round(Math.abs(n)).toLocaleString('en-IN')

  return (
    <div className={cn(
      'bg-zinc-900 border rounded-xl transition-all duration-200',
      envsPositive ? 'border-zinc-700/40 hover:border-zinc-600/60' : 'border-zinc-800/60',
    )}>
      {/* Card header — always visible */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-3 p-4 text-left"
      >
        {/* Rank badge */}
        <div className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5',
          RANK_COLORS[rank] ?? 'bg-zinc-800 text-zinc-400'
        )}>
          {rank}
        </div>

        {/* Card info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-zinc-100">{card.cardName}</span>
            {tier === 'preferred_brand' && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                ★ Preferred
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-xs text-zinc-500">{card.bank}</span>
            <span className="text-zinc-700">•</span>
            <span className="text-xs text-zinc-500">{card.cardType}</span>
          </div>
        </div>

        {/* ENVS score */}
        <div className="text-right shrink-0">
          <div className={cn('text-xl font-bold tabular-nums', envsPositive ? 'text-emerald-400' : 'text-red-400')}>
            {envsPositive ? '+' : '-'}{fmt(envsResult.envs)}
          </div>
          <div className="text-[10px] text-zinc-600 font-medium">/year net</div>
        </div>

        {/* Expand toggle */}
        <div className="text-zinc-600 shrink-0 mt-1">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-zinc-800/60 pt-4">
          {/* Breakdown row */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-zinc-800/50 rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-zinc-500 mb-1">Rewards</div>
              <div className="text-xs font-semibold text-emerald-400 tabular-nums">+{fmt(scoreBreakdown.totalRewards)}</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-zinc-500 mb-1">Annual Fee</div>
              <div className="text-xs font-semibold tabular-nums">
                {scoreBreakdown.annualFee === 0
                  ? <span className="text-emerald-400">Waived</span>
                  : <span className="text-red-400">-{fmt(scoreBreakdown.annualFee)}</span>}
              </div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-zinc-500 mb-1">Join/yr</div>
              <div className="text-xs font-semibold tabular-nums">
                {scoreBreakdown.joiningFeeAmortized === 0
                  ? <span className="text-zinc-500">Free</span>
                  : <span className="text-zinc-400">-{fmt(scoreBreakdown.joiningFeeAmortized)}</span>}
              </div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-zinc-500 mb-1">Break-even</div>
              <div className="text-xs font-semibold text-zinc-300">
                {envsResult.breakEvenMonth >= 999 ? 'N/A' : envsResult.breakEvenMonth === 0 ? 'Day 1' : `M${envsResult.breakEvenMonth}`}
              </div>
            </div>
          </div>

          {/* Match & alignment badges */}
          {(envsResult.matchPercentage > 0 || envsResult.spendAlignmentScore >= 60) && (
            <div className="flex items-center gap-2 flex-wrap">
              {envsResult.matchPercentage > 0 && (
                <span className="text-xs text-zinc-400 bg-zinc-800/60 px-2.5 py-1 rounded-full">
                  <span className="text-emerald-400 font-semibold">{envsResult.matchPercentage}%</span> of spend earns bonus rewards
                </span>
              )}
              {envsResult.spendAlignmentScore >= 60 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                  ✦ Great match
                </span>
              )}
            </div>
          )}

          {/* Sign-up + milestone bonuses */}
          {(envsResult.signUpBonusAmortized > 0 || envsResult.milestoneBonus > 0 || (card.signUpBonus > 0 && !envsResult.signUpBonusAchievable)) && (
            <div className="flex items-center gap-3 flex-wrap">
              {card.signUpBonus > 0 && (
                <span className={cn(
                  'text-xs px-2.5 py-1 rounded-full',
                  envsResult.signUpBonusAchievable
                    ? 'text-zinc-400 bg-zinc-800/60'
                    : 'text-zinc-600 bg-zinc-800/40 line-through'
                )}>
                  🎁 Sign-up {fmt(card.signUpBonus)}{envsResult.signUpBonusAchievable ? ' (on track)' : ' (out of reach)'}
                </span>
              )}
              {envsResult.milestoneBonus > 0 && (
                <span className={cn(
                  'text-xs px-2.5 py-1 rounded-full',
                  envsResult.milestoneAchievable ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-500 bg-zinc-800/60'
                )}>
                  🏆 Milestone {fmt(envsResult.milestoneBonus)} {envsResult.milestoneAchievable ? `(${envsResult.milestoneConfidence})` : '(out of reach)'}
                </span>
              )}
            </div>
          )}

          {/* Category breakdown */}
          {Object.keys(envsResult.categoryBreakdown).length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">Category Rewards / Year</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(envsResult.categoryBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, val]) => (
                    <span key={cat} className={cn(
                      'text-[11px] px-2 py-0.5 rounded-full',
                      val > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-600'
                    )}>
                      {cat}: {val > 0 ? `+${fmt(val)}` : fmt(val)}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Card tags */}
          {card.bestForTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {card.bestForTags.map(tag => (
                <span key={tag} className="text-[11px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full">{tag}</span>
              ))}
            </div>
          )}

          {/* Reasoning */}
          <div className="bg-zinc-800/40 border-l-2 border-emerald-500/30 rounded-r-lg px-3 py-2.5">
            <p className="text-xs text-zinc-400 italic leading-relaxed">{reasoning}</p>
          </div>

          {/* Lounge + Forex */}
          <div className="flex items-center gap-4 text-[11px] text-zinc-500 flex-wrap">
            {card.loungeAccess !== 'none' && (
              <span>🛋️ Lounge: {card.loungeAccess} ({card.loungeVisitsPerYear}/yr)</span>
            )}
            {card.forexMarkup > 0 && <span>🌐 Forex: {card.forexMarkup}%</span>}
            {card.fuelSurchargeWaiver && <span>⛽ Fuel waiver</span>}
          </div>

          {/* Apply button / intent captured */}
          {intentCaptured ? (
            <div className="w-full py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-center gap-2 text-emerald-400 text-sm font-semibold">
              <CheckCircle className="w-4 h-4" />
              Intent captured — our team will reach out soon
            </div>
          ) : (
            <button
              onClick={async () => {
                setIntentCaptured(true)
                // Fire-and-forget — save intent to DB
                fetch('/api/credit-cards/apply-intent', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ cardId: card.id, cardName: card.cardName, bank: card.bank }),
                }).catch(() => {/* silent — never break UX */})
              }}
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              Apply Now
            </button>
          )}
        </div>
      )}
    </div>
  )
}
