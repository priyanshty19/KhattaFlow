import { prisma } from '@/lib/prisma'
import { mapCategoryToRewardKey } from './category-mapper'

export interface SpendInferenceResult {
  spendDistribution: Record<string, number>  // ₹/month avg per reward category
  totalMonthlySpend: number
  source: 'auto' | 'insufficient_data'
  transactionMonths: number
  categoryCount: number
}

export async function buildSpendDistributionFromTransactions(
  userId: string,
  months = 3,
): Promise<SpendInferenceResult> {
  // Build month strings for the last N months
  const now = new Date()
  const monthStrings: string[] = []
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthStrings.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: 'expense',
      month: { in: monthStrings },
      deletedAt: null,
    },
    include: { category: { select: { name: true, slug: true } } },
  })

  if (transactions.length < 10) {
    return { spendDistribution: {}, totalMonthlySpend: 0, source: 'insufficient_data', transactionMonths: months, categoryCount: 0 }
  }

  // Aggregate spend per reward category (sum in paise, then convert to ₹)
  const rawByCategory: Record<string, number> = {}
  for (const tx of transactions) {
    const rewardKey = mapCategoryToRewardKey(tx.category.name, tx.category.slug)
    if (!rewardKey) continue
    rawByCategory[rewardKey] = (rawByCategory[rewardKey] ?? 0) + tx.amount
  }

  // Distinct months that actually have data
  const distinctMonths = new Set(transactions.map(t => t.month)).size || 1

  // Convert paise to ₹ and compute monthly average
  const spendDistribution: Record<string, number> = {}
  for (const [key, paiseTotal] of Object.entries(rawByCategory)) {
    spendDistribution[key] = Math.round(paiseTotal / 100 / distinctMonths)
  }

  const totalMonthlySpend = Object.values(spendDistribution).reduce((a, b) => a + b, 0)

  return {
    spendDistribution,
    totalMonthlySpend,
    source: 'auto',
    transactionMonths: distinctMonths,
    categoryCount: Object.keys(spendDistribution).length,
  }
}
