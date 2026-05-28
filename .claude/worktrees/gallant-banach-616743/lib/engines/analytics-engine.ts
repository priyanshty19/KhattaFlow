// lib/engines/analytics-engine.ts
import type { MonthlySummary } from './transaction-engine'
import type { CategoryGroup } from './transaction-engine'

export interface TrendDataPoint {
  month: string         // '2026-05'
  income: number        // rupees (display)
  expenses: number
  savings: number
  investments: number
  netBalance: number
  savingsRate: number   // 0–100
}

export interface MoMChange {
  delta: number
  percentage: number
  direction: 'up' | 'down' | 'neutral'
}

export class AnalyticsEngine {

  static computeSpendingTrend(
    summaries: Array<{
      month: string
      totalIncome: number
      totalExpenses: number
      totalSavings: number
      totalInvestments: number
    }>,
    months = 6
  ): TrendDataPoint[] {
    return summaries.slice(-months).map(s => ({
      month: s.month,
      income: s.totalIncome / 100,
      expenses: s.totalExpenses / 100,
      savings: s.totalSavings / 100,
      investments: s.totalInvestments / 100,
      netBalance: (s.totalIncome - s.totalExpenses) / 100,
      savingsRate: s.totalIncome > 0
        ? ((s.totalSavings + s.totalInvestments) / s.totalIncome) * 100
        : 0,
    }))
  }

  static computeSavingsRate(summary: {
    totalIncome: number
    totalSavings: number
    totalInvestments: number
  }): number {
    const totalOutgo = summary.totalSavings + summary.totalInvestments
    return summary.totalIncome > 0 ? (totalOutgo / summary.totalIncome) * 100 : 0
  }

  static computeMoMChange(current: number, previous: number): MoMChange {
    if (previous === 0) return { delta: current, percentage: 0, direction: 'neutral' }
    const delta = current - previous
    const percentage = (delta / previous) * 100
    return {
      delta,
      percentage,
      direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral',
    }
  }

  static computeCategoryAllocation(
    groups: CategoryGroup[],
    totalIncome: number
  ) {
    return groups.map(g => ({
      ...g,
      percentage: totalIncome > 0 ? (g.total / totalIncome) * 100 : 0,
      amountDisplay: g.total / 100,
    }))
  }
}
