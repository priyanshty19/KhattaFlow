export const dynamic = 'force-dynamic'
// app/api/predictions/month-end/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PredictionEngine } from '@/lib/engines/prediction-engine'
import { getDaysInMonth, getDaysElapsed } from '@/lib/utils/date'

export async function GET(req: Request) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 })

  const [summary, fixedBudgets] = await Promise.all([
    prisma.monthlySummary.findUnique({ where: { userId_month: { userId, month } } }),
    prisma.budget.findMany({
      where: { userId, month },
      include: { category: { select: { isFixed: true } } },
    }),
  ])

  if (!summary) return NextResponse.json(null)

  const daysElapsed = getDaysElapsed(month)
  const daysInMonth = getDaysInMonth(month)

  // Calculate remaining fixed commitments not yet logged
  const fixedCommitmentsRemaining = fixedBudgets
    .filter(b => b.category.isFixed)
    .reduce((sum, b) => sum + b.amount, 0)

  const prediction = PredictionEngine.predictMonthEnd({
    currentExpenses: summary.totalExpenses,
    currentIncome: summary.totalIncome,
    daysElapsed,
    daysInMonth,
    fixedCommitmentsRemaining,
  })

  return NextResponse.json(prediction)
}
