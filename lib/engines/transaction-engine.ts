// lib/engines/transaction-engine.ts
import type { Transaction, Category } from '@prisma/client'

type TransactionWithCategory = Transaction & { category: Pick<Category, 'name' | 'color' | 'icon' | 'type'> }

export interface MonthlySummary {
  totalIncome: number     // paise
  totalExpenses: number
  totalSavings: number
  totalInvestments: number
  transactionCount: number
}

export interface CategoryGroup {
  categoryId: string
  categoryName: string
  categoryColor: string
  categoryIcon: string | null
  type: string
  total: number           // paise
  count: number
  transactions: TransactionWithCategory[]
}

export class TransactionEngine {

  static computeMonthlySummary(transactions: TransactionWithCategory[]): MonthlySummary {
    return transactions.reduce(
      (acc, t) => {
        switch (t.type) {
          case 'income':     acc.totalIncome += t.amount;      break
          case 'expense':    acc.totalExpenses += t.amount;    break
          case 'savings':    acc.totalSavings += t.amount;     break
          case 'investment': acc.totalInvestments += t.amount; break
        }
        acc.transactionCount += 1
        return acc
      },
      { totalIncome: 0, totalExpenses: 0, totalSavings: 0, totalInvestments: 0, transactionCount: 0 }
    )
  }

  static computeNetBalance(summary: MonthlySummary): number {
    return summary.totalIncome - summary.totalExpenses - summary.totalInvestments - summary.totalSavings
  }

  static groupByCategory(transactions: TransactionWithCategory[]): CategoryGroup[] {
    const map = new Map<string, CategoryGroup>()

    for (const t of transactions) {
      if (!t.category) continue // skip orphaned transactions without a category
      const existing = map.get(t.categoryId)
      if (existing) {
        existing.total += t.amount
        existing.count += 1
        existing.transactions.push(t)
      } else {
        map.set(t.categoryId, {
          categoryId: t.categoryId,
          categoryName: t.category.name,
          categoryColor: t.category.color,
          categoryIcon: t.category.icon,
          type: t.category.type,
          total: t.amount,
          count: 1,
          transactions: [t],
        })
      }
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }

  static getTopSpendCategories(groups: CategoryGroup[], n = 5): CategoryGroup[] {
    return groups.filter(g => g.type === 'expense').slice(0, n)
  }
}
