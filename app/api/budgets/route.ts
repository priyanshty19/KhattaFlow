export const dynamic = 'force-dynamic'
// app/api/budgets/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { upsertBudgetSchema } from '@/lib/validations/budget'

export async function GET(req: Request) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 })

  const budgets = await prisma.budget.findMany({
    where: { userId, month },
    include: { category: { select: { name: true, color: true, icon: true, type: true, isFixed: true } } },
    orderBy: { category: { sortOrder: 'asc' } },
  })

  return NextResponse.json(budgets)
}

export async function POST(req: Request) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = upsertBudgetSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const key = { userId, categoryId: parsed.data.categoryId, month: parsed.data.month }

  // amount=0 means "remove budget"
  if (parsed.data.amount === 0) {
    await prisma.budget.deleteMany({ where: key })
    return NextResponse.json({ ok: true, deleted: true })
  }

  const budget = await prisma.budget.upsert({
    where: { userId_categoryId_month: key },
    create: { ...parsed.data, userId },
    update: { amount: parsed.data.amount },
    include: { category: { select: { name: true, color: true, icon: true, type: true } } },
  })

  return NextResponse.json(budget, { status: 201 })
}
