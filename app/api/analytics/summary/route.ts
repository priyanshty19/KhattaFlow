export const dynamic = 'force-dynamic'
// app/api/analytics/summary/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TransactionEngine } from '@/lib/engines/transaction-engine'
import { AnalyticsEngine } from '@/lib/engines/analytics-engine'

export async function GET(req: Request) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 })

  // Try cached summary first
  const cached = await prisma.monthlySummary.findUnique({
    where: { userId_month: { userId, month } },
  })

  if (cached) {
    const transactions = await prisma.transaction.findMany({
      where: { userId, month, deletedAt: null },
      include: { category: { select: { name: true, color: true, icon: true, type: true } } },
    })

    const categoryGroups = TransactionEngine.groupByCategory(transactions as any)
    const savingsRate = AnalyticsEngine.computeSavingsRate(cached as any)

    return NextResponse.json({
      summary: cached,
      categoryGroups,
      savingsRate,
    })
  }

  // Compute from scratch if no cache
  const transactions = await prisma.transaction.findMany({
    where: { userId, month, deletedAt: null },
    include: { category: { select: { name: true, color: true, icon: true, type: true } } },
  })

  const summary = TransactionEngine.computeMonthlySummary(transactions as any)
  const categoryGroups = TransactionEngine.groupByCategory(transactions as any)
  const savingsRate = AnalyticsEngine.computeSavingsRate(summary)

  return NextResponse.json({ summary, categoryGroups, savingsRate })
}
