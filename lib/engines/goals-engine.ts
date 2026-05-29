// lib/engines/goals-engine.ts
// Pure, unit-testable projection + optimization logic for Goals Achiever.
// All monetary values are in paise (integers); math is unit-agnostic so it works directly.

import {
  VEHICLES,
  TARGET_MIX,
  CRYPTO_MAX_SHARE,
  getVehicleRate,
  type Vehicle,
} from '@/constants/investment-returns'
import type { InvestmentStyle } from '@/constants/categories'

export interface Allocation {
  vehicle: Vehicle
  monthlyAmount: number // paise/month
  currentValue?: number // existing corpus, paise
}

export interface Goal {
  id?: string
  name: string
  targetAmount: number // paise
  targetDate: string | Date
}

export type GoalStatus = 'on_track' | 'behind' | 'ahead'

export interface GoalEvaluation {
  goalId?: string
  name: string
  target: number
  projected: number
  gapPct: number // (projected - target) / target
  status: GoalStatus
  monthsRemaining: number
  monthlyInvesting: number // current total monthly SIP, paise
  requiredMonthly: number // monthly SIP needed to hit target, paise
  shortfallMonthly: number // max(0, requiredMonthly - monthlyInvesting), paise
}

export type OptimizerAction = 'increase' | 'decrease' | 'maintain'

export interface OptimizerSuggestion {
  vehicle: Vehicle
  action: OptimizerAction
  currentShare: number // 0–1
  targetShare: number // 0–1
  deltaMonthly: number // paise/month, signed (positive = add, negative = reduce)
  reason: string
}

// ── Core finance math ────────────────────────────────────────────────────────

/** Monthly investment total across allocations (paise). */
export function monthlyTotal(allocations: Allocation[]): number {
  return allocations.reduce((s, a) => s + Math.max(0, a.monthlyAmount), 0)
}

/** Existing corpus total across allocations (paise). */
export function existingCorpus(allocations: Allocation[]): number {
  return allocations.reduce((s, a) => s + Math.max(0, a.currentValue ?? 0), 0)
}

/**
 * Portfolio blended annual return (decimal), weighted by monthly contribution.
 * Falls back to weighting by current corpus, then to 0 when there is nothing invested.
 */
export function blendedReturn(allocations: Allocation[]): number {
  const byMonthly = allocations.reduce(
    (acc, a) => {
      const w = Math.max(0, a.monthlyAmount)
      return { sum: acc.sum + w * getVehicleRate(a.vehicle), w: acc.w + w }
    },
    { sum: 0, w: 0 },
  )
  if (byMonthly.w > 0) return byMonthly.sum / byMonthly.w

  const byValue = allocations.reduce(
    (acc, a) => {
      const w = Math.max(0, a.currentValue ?? 0)
      return { sum: acc.sum + w * getVehicleRate(a.vehicle), w: acc.w + w }
    },
    { sum: 0, w: 0 },
  )
  return byValue.w > 0 ? byValue.sum / byValue.w : 0
}

/**
 * Future value of an existing corpus + a monthly SIP (annuity-due — contributions
 * made at the start of each month) compounded monthly.
 *   FV = corpus·(1+i)^n + P·[((1+i)^n − 1)/i]·(1+i)
 */
export function projectCorpus(params: {
  monthlyContribution: number
  existingCorpus: number
  annualRate: number
  months: number
}): number {
  const { monthlyContribution: P, existingCorpus: C, annualRate, months: n } = params
  if (n <= 0) return Math.round(C)
  const i = annualRate / 12
  if (i === 0) return Math.round(C + P * n)
  const growth = Math.pow(1 + i, n)
  const sipFV = P * ((growth - 1) / i) * (1 + i)
  return Math.round(C * growth + sipFV)
}

/**
 * Monthly SIP required to reach `target` given an existing corpus and rate.
 * Inverse of projectCorpus solved for P. Returns 0 if the corpus alone gets there.
 */
export function requiredMonthly(params: {
  target: number
  existingCorpus: number
  annualRate: number
  months: number
}): number {
  const { target, existingCorpus: C, annualRate, months: n } = params
  if (n <= 0) return Math.max(0, Math.round(target - C))
  const i = annualRate / 12
  const growth = Math.pow(1 + i, n)
  const remaining = target - C * growth
  if (remaining <= 0) return 0
  const annuityFactor = i === 0 ? n : ((growth - 1) / i) * (1 + i)
  return Math.round(remaining / annuityFactor)
}

/** Whole months from now until `date` (minimum 1 so projections never divide oddly). */
export function monthsUntil(date: string | Date, now: Date = new Date()): number {
  const target = typeof date === 'string' ? new Date(date) : date
  const months =
    (target.getFullYear() - now.getFullYear()) * 12 +
    (target.getMonth() - now.getMonth())
  // partial month credit if the day-of-month hasn't passed
  const adj = target.getDate() >= now.getDate() ? months : months - 1
  return Math.max(1, adj)
}

// ── Goal evaluation ────────────────────────────────────────────────────────

export function evaluateGoal(
  goal: Goal,
  allocations: Allocation[],
  now: Date = new Date(),
): GoalEvaluation {
  const months = monthsUntil(goal.targetDate, now)
  const rate = blendedReturn(allocations)
  const monthly = monthlyTotal(allocations)
  const corpus = existingCorpus(allocations)

  const projected = projectCorpus({
    monthlyContribution: monthly,
    existingCorpus: corpus,
    annualRate: rate,
    months,
  })
  const required = requiredMonthly({
    target: goal.targetAmount,
    existingCorpus: corpus,
    annualRate: rate,
    months,
  })

  const gapPct = goal.targetAmount > 0 ? (projected - goal.targetAmount) / goal.targetAmount : 0
  const status: GoalStatus = gapPct >= 0.1 ? 'ahead' : gapPct < -0.05 ? 'behind' : 'on_track'

  return {
    goalId: goal.id,
    name: goal.name,
    target: goal.targetAmount,
    projected,
    gapPct,
    status,
    monthsRemaining: months,
    monthlyInvesting: monthly,
    requiredMonthly: required,
    shortfallMonthly: Math.max(0, required - monthly),
  }
}

/** A year-by-year projected-corpus series for charting against the goal target. */
export function projectionSeries(
  allocations: Allocation[],
  months: number,
): { month: number; value: number }[] {
  const rate = blendedReturn(allocations)
  const monthly = monthlyTotal(allocations)
  const corpus = existingCorpus(allocations)
  const series: { month: number; value: number }[] = []
  const step = months <= 24 ? 1 : 3 // monthly for short horizons, quarterly otherwise
  for (let m = 0; m <= months; m += step) {
    series.push({
      month: m,
      value: projectCorpus({ monthlyContribution: monthly, existingCorpus: corpus, annualRate: rate, months: m }),
    })
  }
  if (series[series.length - 1]?.month !== months) {
    series.push({
      month: months,
      value: projectCorpus({ monthlyContribution: monthly, existingCorpus: corpus, annualRate: rate, months }),
    })
  }
  return series
}

// ── Allocation optimizer ───────────────────────────────────────────────────

const SIGNIFICANT_SHARE_DELTA = 0.05 // ignore <5% drift to avoid noise

export function optimizeAllocations(
  allocations: Allocation[],
  style: InvestmentStyle,
): OptimizerSuggestion[] {
  const total = monthlyTotal(allocations)
  const target = TARGET_MIX[style]
  const suggestions: OptimizerSuggestion[] = []

  // current share per vehicle
  const currentShare = new Map<Vehicle, number>()
  for (const a of allocations) {
    const share = total > 0 ? Math.max(0, a.monthlyAmount) / total : 0
    currentShare.set(a.vehicle, (currentShare.get(a.vehicle) ?? 0) + share)
  }

  // union of vehicles present in allocation or target mix
  const vehicles: Vehicle[] = Array.from(
    new Set<Vehicle>([
      ...allocations.map((a) => a.vehicle),
      ...(Object.keys(target) as Vehicle[]),
    ]),
  )

  for (const v of vehicles) {
    const cur = currentShare.get(v) ?? 0
    const tgt = target[v] ?? 0
    const diff = tgt - cur
    const deltaMonthly = Math.round(diff * total)

    // crypto over-exposure takes priority
    if (v === 'crypto' && cur > CRYPTO_MAX_SHARE[style]) {
      suggestions.push({
        vehicle: v,
        action: 'decrease',
        currentShare: cur,
        targetShare: CRYPTO_MAX_SHARE[style],
        deltaMonthly: Math.round((CRYPTO_MAX_SHARE[style] - cur) * total),
        reason: `Crypto is ${(cur * 100).toFixed(0)}% of your monthly investing — high volatility. Cap it around ${(CRYPTO_MAX_SHARE[style] * 100).toFixed(0)}% for a ${style} profile.`,
      })
      continue
    }

    if (Math.abs(diff) < SIGNIFICANT_SHARE_DELTA) {
      suggestions.push({ vehicle: v, action: 'maintain', currentShare: cur, targetShare: tgt, deltaMonthly: 0, reason: 'Well aligned with your target mix.' })
      continue
    }

    const meta = VEHICLES[v]
    if (diff > 0) {
      suggestions.push({
        vehicle: v,
        action: 'increase',
        currentShare: cur,
        targetShare: tgt,
        deltaMonthly,
        reason: meta.group === 'equity'
          ? `Under-allocated to ${meta.label}. Growth assets like this drive long-term returns for a ${style} profile.`
          : `Add to ${meta.label} to reach your target ${ (tgt * 100).toFixed(0) }% allocation.`,
      })
    } else {
      suggestions.push({
        vehicle: v,
        action: 'decrease',
        currentShare: cur,
        targetShare: tgt,
        deltaMonthly,
        reason: meta.group === 'fixed_income'
          ? `Over-allocated to ${meta.label} (${(cur * 100).toFixed(0)}%). Shifting some toward growth assets can improve long-run returns.`
          : `Trim ${meta.label} toward your target ${ (tgt * 100).toFixed(0) }% allocation.`,
      })
    }
  }

  // sort: actionable (largest absolute monthly delta) first, maintains last
  return suggestions.sort((a, b) => {
    if (a.action === 'maintain' && b.action !== 'maintain') return 1
    if (b.action === 'maintain' && a.action !== 'maintain') return -1
    return Math.abs(b.deltaMonthly) - Math.abs(a.deltaMonthly)
  })
}
