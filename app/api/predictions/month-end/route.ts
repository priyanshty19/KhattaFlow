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
      include: { category: { select: { isFixed: true, id: true, type: true } } },
    }),
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

  const spentByCategoryId = new Map(
    fixedSpend.map(s => [s.categoryId, s._sum.amount ?? 0])
  )

  // Only count unpaid fixed EXPENSE commitments (savings/investments are handled separately)
  const fixedCommitmentsRemaining = fixedBudgets
    .filter(b => b.category.isFixed && b.category.type === 'expense')
    .reduce((sum, b) => {
      const alreadySpent = spentByCategoryId.get(b.category.id) ?? 0
      return sum + Math.max(0, b.amount - alreadySpent)
    }, 0)

  const prediction = PredictionEngine.predictMonthEnd({
    currentNetBalance: summary.netBalance,
    currentExpenses: summary.totalExpenses,  // variable expense burn rate only
    totalIncome: summary.totalIncome,
    daysElapsed,
    daysInMonth,
    fixedCommitmentsRemaining,
  })

  return NextResponse.json(prediction)
}
