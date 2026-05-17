export const dynamic = 'force-dynamic'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PredictionEngine } from '@/lib/engines/prediction-engine'
import { getDaysInMonth, getDaysElapsed } from '@/lib/utils/date'

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 })

  const [summary, fixedBudgets, fixedSpend] = await Promise.all([
    prisma.monthlySummary.findUnique({ where: { userId_month: { userId, month } } }),
    prisma.budget.findMany({
      where: { userId, month },
      include: { category: { select: { isFixed: true, id: true } } },
    }),
    // Actual spending per category for fixed categories this month
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        month,
        type: { in: ['expense', 'savings', 'investment'] },
      },
      _sum: { amount: true },
    }),
  ])

  if (!summary) return NextResponse.json(null)

  const daysElapsed = getDaysElapsed(month)
  const daysInMonth = getDaysInMonth(month)

  // Build a map of categoryId → amount already spent
  const spentByCategoryId = new Map(
    fixedSpend.map(s => [s.categoryId, s._sum.amount ?? 0])
  )

  // Only count fixed budget amounts NOT yet paid this month
  const fixedCommitmentsRemaining = fixedBudgets
    .filter(b => b.category.isFixed)
    .reduce((sum, b) => {
      const alreadySpent = spentByCategoryId.get(b.category.id) ?? 0
      return sum + Math.max(0, b.amount - alreadySpent)
    }, 0)

  // Total outflow includes expenses + savings + investments
  const currentOutflow = summary.totalExpenses + summary.totalSavings + summary.totalInvestments

  const prediction = PredictionEngine.predictMonthEnd({
    currentExpenses: currentOutflow,
    currentIncome: summary.totalIncome,
    daysElapsed,
    daysInMonth,
    fixedCommitmentsRemaining,
  })

  return NextResponse.json(prediction)
}
