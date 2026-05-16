// app/api/budgets/status/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BudgetEngine } from '@/lib/engines/budget-engine'
import { TransactionEngine } from '@/lib/engines/transaction-engine'

export async function GET(req: Request) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 })

  const [budgets, transactions] = await Promise.all([
    prisma.budget.findMany({
      where: { userId, month },
      include: { category: { select: { name: true, color: true, icon: true, type: true, slug: true, isFixed: true, group: true } } },
    }),
    prisma.transaction.findMany({
      where: { userId, month, deletedAt: null },
      include: { category: { select: { name: true, color: true, icon: true, type: true, slug: true } } },
    }),
  ])

  const categoryGroups = TransactionEngine.groupByCategory(transactions as any)
  const statuses = BudgetEngine.computeBudgetStatus(budgets as any, categoryGroups)
  const overall = BudgetEngine.computeOverallUtilization(statuses)

  return NextResponse.json({ statuses, overall })
}
