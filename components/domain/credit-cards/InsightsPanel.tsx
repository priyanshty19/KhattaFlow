'use client'
import { cn } from '@/lib/utils/cn'
import type { ScoredCard } from '@/lib/engines/credit-card-engine'

interface InsightsPanelProps {
  recommendations: ScoredCard[]
}

const RANK_BADGES = [
  { label: '#1', ring: 'ring-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
  { label: '#2', ring: 'ring-zinc-400/40 bg-zinc-800/80 text-zinc-300' },
  { label: '#3', ring: 'ring-amber-500/30 bg-amber-500/10 text-amber-400' },
]

const NETWORK_LOGOS: Record<string, string> = {
  Visa: 'VISA',
  Mastercard: 'MC',
  RuPay: 'RP',
  Amex: 'AMEX',
  Diners: 'DC',
}

export function InsightsPanel({ recommendations }: InsightsPanelProps) {
  if (!recommendations.length) return null

  const fmt = (n: number) => '₹' + Math.round(Math.abs(n)).toLocaleString('en-IN')
  const top3 = recommendations.slice(0, 3)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
          Top 3 Selection Analysis
        </p>
        <span className="text-[10px] text-zinc-600 font-normal normal-case">why these cards, how to use them, key benefits</span>
      </div>

      {top3.map((scored, i) => {
        const { card, envsResult, scoreBreakdown } = scored
        const badge = RANK_BADGES[i]

        // ── WHY: top earning categories ──────────────────────────────────
        const topCats = Object.entries(envsResult.categoryBreakdown)
          .filter(([, v]) => v > 0)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)

        // ── HOW TO USE: fee waiver + milestone ────────────────────────────
        const howToUse: string[] = []
        if (card.feeWaiverThreshold > 0) {
          howToUse.push(`Spend ${fmt(card.feeWaiverThreshold)}/yr to waive the ${fmt(card.annualFee)} fee`)
        }
        if (card.minAnnualSpend > 0 && card.milestoneBonus > 0) {
          howToUse.push(`Hit ${fmt(card.minAnnualSpend)} annual spend for ${fmt(card.milestoneBonus)} milestone bonus`)
        }
        if (card.signUpBonus > 0 && card.signUpSpendRequired > 0) {
          howToUse.push(`Spend ${fmt(card.signUpSpendRequired)} in first ${card.signUpWindowDays || 90} days for ${fmt(card.signUpBonus)} welcome bonus`)
        }
        if (topCats.length > 0) {
          howToUse.push(`Always use for ${topCats.map(([c]) => c).join(' & ')} — highest earn rate categories`)
        }
        if (card.fuelSurchargeWaiver) {
          howToUse.push('Use at fuel stations — saves 1% surcharge every fill-up')
        }
        if (card.forexMarkup === 0) {
          howToUse.push('Zero forex markup — best card for international spend')
        }

        // ── BENEFITS: perks & features ────────────────────────────────────
        const benefits: { icon: string; label: string; sub: string }[] = []

        if (envsResult.loungeAnnualValue > 0) {
          const visits = card.loungeVisitsPerYear > 50
            ? 'Unlimited'
            : `${card.loungeVisitsPerYear} visits`
          benefits.push({
            icon: '🛋️',
            label: `Lounge access — ${visits}/yr`,
            sub: `${fmt(envsResult.loungeAnnualValue)} annual value`,
          })
        }

        if (envsResult.forexAnnualCost === 0 && card.forexMarkup === 0) {
          benefits.push({
            icon: '🌐',
            label: 'Zero forex markup',
            sub: 'No surcharge on international transactions',
          })
        } else if (card.forexMarkup > 0 && envsResult.forexAnnualCost > 0) {
          benefits.push({
            icon: '🌐',
            label: `${card.forexMarkup}% forex markup`,
            sub: `Costs ${fmt(envsResult.forexAnnualCost)}/yr on your intl spend`,
          })
        }

        if (card.fuelSurchargeWaiver && envsResult.fuelSurchargeAnnualSavings > 0) {
          benefits.push({
            icon: '⛽',
            label: 'Fuel surcharge waiver',
            sub: `Saves ${fmt(envsResult.fuelSurchargeAnnualSavings)}/yr`,
          })
        }

        const rewardLabel =
          card.rewardType === 'cashback' ? 'Direct cashback' :
          card.rewardType === 'miles' ? 'Air miles' :
          card.rewardType === 'hybrid' ? 'Points + cashback' :
          'Reward points'
        benefits.push({
          icon: card.rewardType === 'cashback' ? '💵' : card.rewardType === 'miles' ? '✈️' : '⭐',
          label: rewardLabel,
          sub: `₹${(card.pointValue ?? 0).toFixed(2)} per point · base ${card.baseRewardRate ?? 0}%`,
        })

        if (card.features) {
          const firstFeature = card.features.split('|')[0]?.trim()
          if (firstFeature) {
            benefits.push({ icon: '✨', label: firstFeature, sub: 'Key feature' })
          }
        }

        const networkCode = NETWORK_LOGOS[card.networkType ?? 'Visa'] ?? 'VISA'
        const feeWaiverStatus = envsResult.feeWaiverConfidence

        return (
          <div
            key={card.id}
            className="bg-zinc-900 border border-zinc-700/40 rounded-xl overflow-hidden"
          >
            {/* ── Card header ─────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/60 bg-zinc-800/20">
              <div className={cn(
                'w-8 h-8 rounded-full ring-1 flex items-center justify-center text-xs font-bold shrink-0',
                badge.ring
              )}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-zinc-100">{card.cardName}</span>
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide',
                    networkCode === 'AMEX' ? 'bg-blue-500/20 text-blue-400' :
                    networkCode === 'MC' ? 'bg-red-500/10 text-red-400' :
                    networkCode === 'RP' ? 'bg-orange-500/10 text-orange-400' :
                    'bg-zinc-700/60 text-zinc-400'
                  )}>
                    {networkCode}
                  </span>
                  {feeWaiverStatus === 'achieved' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Fee waived
                    </span>
                  )}
                  {feeWaiverStatus === 'near' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Fee waiver near
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">{card.bank} · {card.cardType}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-base font-bold text-emerald-400 tabular-nums">
                  {envsResult.envs >= 0 ? '+' : '-'}{fmt(envsResult.envs)}
                </p>
                <p className="text-[10px] text-zinc-600">/yr net</p>
              </div>
            </div>

            {/* ── Three-column body ────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800/60">

              {/* WHY */}
              <div className="p-4 space-y-2.5">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-emerald-500">●</span> Why selected
                </p>
                {topCats.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic">No category bonus — base rewards apply</p>
                ) : (
                  <div className="space-y-2">
                    {topCats.map(([cat, val]) => (
                      <div key={cat} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-zinc-400 truncate">{cat}</span>
                        <span className="text-xs font-semibold text-emerald-400 tabular-nums shrink-0">
                          +{fmt(val)}/yr
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="pt-1 border-t border-zinc-800/50 grid grid-cols-2 gap-1.5 text-center">
                  <div className="bg-zinc-800/40 rounded-lg p-2">
                    <p className="text-[10px] text-zinc-600">Rewards</p>
                    <p className="text-xs font-semibold text-emerald-400 tabular-nums">+{fmt(scoreBreakdown.totalRewards)}</p>
                  </div>
                  <div className="bg-zinc-800/40 rounded-lg p-2">
                    <p className="text-[10px] text-zinc-600">Net fee</p>
                    <p className="text-xs font-semibold tabular-nums">
                      {envsResult.effectiveAnnualFee === 0
                        ? <span className="text-emerald-400">Free</span>
                        : <span className="text-zinc-400">-{fmt(envsResult.effectiveAnnualFee)}</span>
                      }
                    </p>
                  </div>
                </div>
                {envsResult.envsYear1 !== envsResult.envsYear2Plus && (
                  <div className="text-[10px] text-zinc-500 bg-zinc-800/30 rounded-lg px-2 py-1.5 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Year 1</span>
                      <span className={envsResult.envsYear1 >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {envsResult.envsYear1 >= 0 ? '+' : '-'}{fmt(envsResult.envsYear1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Year 2+</span>
                      <span className={envsResult.envsYear2Plus >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {envsResult.envsYear2Plus >= 0 ? '+' : '-'}{fmt(envsResult.envsYear2Plus)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* HOW TO USE */}
              <div className="p-4 space-y-2.5">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-blue-400">●</span> How to use
                </p>
                {howToUse.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic">Use for all eligible purchases to maximise base rewards</p>
                ) : (
                  <ul className="space-y-2">
                    {howToUse.slice(0, 4).map((tip, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <span className="text-blue-400/60 mt-0.5 shrink-0 text-[10px]">→</span>
                        <span className="text-xs text-zinc-400 leading-snug">{tip}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {card.platformNote && (
                  <div className="mt-1 text-[10px] text-amber-400/80 bg-amber-500/5 border border-amber-500/10 rounded-lg px-2 py-1.5">
                    ⚠️ {card.platformNote} — platform-specific rate
                  </div>
                )}
              </div>

              {/* BENEFITS */}
              <div className="p-4 space-y-2.5">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-purple-400">●</span> Key benefits
                </p>
                <ul className="space-y-2">
                  {benefits.slice(0, 4).map((b, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <span className="shrink-0 text-sm leading-none mt-0.5">{b.icon}</span>
                      <div>
                        <p className="text-xs text-zinc-300 leading-snug">{b.label}</p>
                        <p className="text-[10px] text-zinc-600 leading-snug">{b.sub}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                {card.bestForTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {card.bestForTags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded-full">{tag}</span>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )
      })}
    </div>
  )
}
