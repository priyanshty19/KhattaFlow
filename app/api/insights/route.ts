// app/api/insights/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { InsightEngine } from '@/lib/engines/insight-engine'
import { TransactionEngine } from '@/lib/engines/transaction-engine'
import { BudgetEngine } from '@/lib/engines/budget-engine'
import { getPreviousMonth } from '@/lib/utils/date'

export async function GET(req: Request) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 })

  const prevMonth = getPreviousMonth(month)

  const [currentSummary, previousSummary, budgets, transactions, user] = await Promise.all([
    prisma.monthlySummary.findUnique({ where: { userId_month: { userId, month } } }),
    prisma.monthlySummary.findUnique({ where: { userId_month: { userId, month: prevMonth } } }),
    prisma.budget.findMany({ where: { userId, month }, include: { category: true } }),
    prisma.transaction.findMany({ where: { userId, month, deletedAt: null } }),
    prisma.user.findUnique({ where: { id: userId }, select: { savingsGoalPct: true } }),
  ])

  if (!currentSummary) {
    return NextResponse.json([])
  }

  const categoryGroups = TransactionEngine.groupByCategory(transactions as any)
  const budgetStatuses = BudgetEngine.computeBudgetStatus(budgets as any, categoryGroups)

  const insights = InsightEngine.generate(
    currentSummary as any,
    previousSummary as any ?? { totalIncome: 0, totalExpenses: 0, totalSavings: 0, totalInvestments: 0 },
    budgetStatuses,
    transactions as any,
    user?.savingsGoalPct ?? 0.20
  )

  return NextResponse.json(insights)
}
