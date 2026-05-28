// lib/engines/summary-engine.ts
import { prisma } from '@/lib/prisma'
import { TransactionEngine } from './transaction-engine'

/**
 * Recomputes and upserts the monthly_summaries cache for a given user+month.
 * Call this after every transaction create / update / delete.
 */
export async function updateMonthlySummary(userId: string, month: string): Promise<void> {
  const transactions = await prisma.transaction.findMany({
    where: { userId, month, deletedAt: null },
    include: { category: { select: { name: true, color: true, icon: true, type: true } } },
  })

  const summary = TransactionEngine.computeMonthlySummary(transactions as any)
  const netBalance = TransactionEngine.computeNetBalance(summary)

  await prisma.monthlySummary.upsert({
    where: { userId_month: { userId, month } },
    create: {
      userId,
      month,
      ...summary,
      netBalance,
      computedAt: new Date(),
    },
    update: {
      ...summary,
      netBalance,
      computedAt: new Date(),
    },
  })
}
