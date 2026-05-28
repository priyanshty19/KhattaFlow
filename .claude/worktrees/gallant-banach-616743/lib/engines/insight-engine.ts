// lib/engines/insight-engine.ts
import type { BudgetStatus } from './budget-engine'
import { AnalyticsEngine } from './analytics-engine'
import { TransactionEngine } from './transaction-engine'
import { formatINR } from '@/lib/utils/currency'

export type InsightSeverity = 'info' | 'warning' | 'success' | 'tip'

export interface Insight {
  id: string
  title: string
  body: string
  severity: InsightSeverity
  categoryId?: string
  actionLabel?: string
  actionHref?: string
}

interface SummaryInput {
  totalIncome: number
  totalExpenses: number
  totalSavings: number
  totalInvestments: number
}

interface TransactionInput {
  paymentMethod: string | null
  amount: number
  categoryId: string
  type: string
}

export class InsightEngine {

  static generate(
    current: SummaryInput,
    previous: SummaryInput,
    budgetStatuses: BudgetStatus[],
    transactions: TransactionInput[],
    savingsGoalPct = 0.20
  ): Insight[] {
    const insights: Insight[] = []

    // ── 1. Savings rate ───────────────────────────────────────────────
    const savingsRate = AnalyticsEngine.computeSavingsRate(current)
    const goalPct = savingsGoalPct * 100

    if (savingsRate >= goalPct) {
      insights.push({
        id: 'savings-on-track',
        title: `Savings rate ${savingsRate.toFixed(1)}% ✓`,
        body: `You're above your ${goalPct.toFixed(0)}% target. Compounding is doing its thing.`,
        severity: 'success',
      })
    } else if (current.totalIncome > 0 && savingsRate < 10) {
      insights.push({
        id: 'savings-low',
        title: 'Savings rate is below 10%',
        body: `You've put away ${savingsRate.toFixed(1)}% of income this month. Target: ${goalPct.toFixed(0)}%.`,
        severity: 'warning',
        actionLabel: 'Review budget',
        actionHref: '/budgets',
      })
    }

    // ── 2. Over-budget categories ─────────────────────────────────────
    const overBudget = budgetStatuses.filter(b => b.status === 'over')
    overBudget.slice(0, 2).forEach(b => {
      insights.push({
        id: `over-budget-${b.categoryId}`,
        title: `Over budget: ${b.categoryName}`,
        body: `Spent ${formatINR(b.spent)} vs ${formatINR(b.budgeted)} budget (${b.percentage.toFixed(0)}%).`,
        severity: 'warning',
        categoryId: b.categoryId,
      })
    })

    // ── 3. Spending spike MOM ─────────────────────────────────────────
    if (previous.totalExpenses > 0) {
      const change = AnalyticsEngine.computeMoMChange(current.totalExpenses, previous.totalExpenses)
      if (change.percentage > 20) {
        insights.push({
          id: 'spending-spike',
          title: `Spending up ${change.percentage.toFixed(0)}% vs last month`,
          body: `Expenses jumped from ${formatINR(previous.totalExpenses)} to ${formatINR(current.totalExpenses)}.`,
          severity: 'warning',
        })
      } else if (change.percentage < -15) {
        insights.push({
          id: 'spending-down',
          title: `Spending down ${Math.abs(change.percentage).toFixed(0)}% vs last month`,
          body: `Good discipline — you spent ${formatINR(Math.abs(change.delta))} less than last month.`,
          severity: 'success',
        })
      }
    }

    // ── 4. CC-heavy month (PT's real pattern) ────────────────────────
    const ccTotal = transactions
      .filter(t => t.paymentMethod === 'credit_card' && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
    const ccRatio = current.totalExpenses > 0 ? ccTotal / current.totalExpenses : 0

    if (ccRatio > 0.5) {
      insights.push({
        id: 'cc-heavy',
        title: 'High credit card spend',
        body: `${(ccRatio * 100).toFixed(0)}% of expenses on CC (${formatINR(ccTotal)}). Confirm you can clear it in full.`,
        severity: 'info',
      })
    }

    // ── 5. Investment consistency ─────────────────────────────────────
    const hasInvestment = current.totalInvestments > 0
    if (!hasInvestment && current.totalIncome > 0) {
      insights.push({
        id: 'no-investment',
        title: 'No investments logged yet',
        body: `No MF or stock investments this month. Your money is sitting idle.`,
        severity: 'tip',
        actionLabel: 'Add investment',
        actionHref: '/transactions?type=investment',
      })
    }

    // ── 6. Month deficit ─────────────────────────────────────────────
    const netBalance = TransactionEngine.computeNetBalance(current as any)
    if (netBalance < -5000) {
      insights.push({
        id: 'deficit',
        title: `Month running ${formatINR(Math.abs(netBalance))} in deficit`,
        body: 'Outflows exceed income logged so far. Double-check if all income is recorded.',
        severity: 'warning',
      })
    }

    // ── 7. Near budget warnings ───────────────────────────────────────
    const nearBudget = budgetStatuses.filter(b => b.status === 'warning' && !overBudget.includes(b))
    if (nearBudget.length > 0) {
      const names = nearBudget.slice(0, 2).map(b => b.categoryName).join(', ')
      insights.push({
        id: 'near-budget',
        title: `Approaching limit: ${names}`,
        body: `${nearBudget.length} categor${nearBudget.length > 1 ? 'ies are' : 'y is'} above 80% of budget.`,
        severity: 'info',
        actionHref: '/budgets',
      })
    }

    return insights.slice(0, 5)
  }
}
