// lib/engines/budget-engine.ts
import type { CategoryGroup } from './transaction-engine'

export type BudgetStatusLevel = 'safe' | 'warning' | 'over'

export interface BudgetStatus {
  categoryId: string
  categoryName: string
  categoryColor: string
  categoryIcon: string | null
  isFixed: boolean
  budgeted: number     // paise
  spent: number        // paise
  remaining: number    // paise
  percentage: number   // 0–100+
  status: BudgetStatusLevel
}

export class BudgetEngine {

  static computeBudgetStatus(
    budgets: Array<{
      categoryId: string
      amount: number
      category: { name: string; color: string; icon: string | null; isFixed: boolean }
    }>,
    actuals: CategoryGroup[]
  ): BudgetStatus[] {
    return budgets.map(budget => {
      const actual = actuals.find(a => a.categoryId === budget.categoryId)
      const spent = actual?.total ?? 0
      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0

      return {
        categoryId: budget.categoryId,
        categoryName: budget.category.name,
        categoryColor: budget.category.color,
        categoryIcon: budget.category.icon,
        isFixed: budget.category.isFixed,
        budgeted: budget.amount,
        spent,
        remaining: budget.amount - spent,
        percentage,
        status: this.getStatus(percentage),
      }
    }).sort((a, b) => b.percentage - a.percentage)
  }

  static getStatus(percentage: number): BudgetStatusLevel {
    if (percentage >= 100) return 'over'
    if (percentage >= 80) return 'warning'
    return 'safe'
  }

  static computeOverallUtilization(statuses: BudgetStatus[]): number {
    const totalBudgeted = statuses.reduce((s, b) => s + b.budgeted, 0)
    const totalSpent = statuses.reduce((s, b) => s + b.spent, 0)
    return totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0
  }

  static rolloverBudgets(
    lastMonthBudgets: Array<{ categoryId: string; amount: number }>,
    newMonth: string,
    userId: string
  ) {
    return lastMonthBudgets.map(b => ({
      userId,
      categoryId: b.categoryId,
      month: newMonth,
      amount: b.amount,
    }))
  }
}
