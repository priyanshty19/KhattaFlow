export const dynamic = 'force-dynamic'
// app/api/split/groups/[id]/cycles/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getGroupAccess } from '@/lib/utils/split-access'
import { createCycleSchema } from '@/lib/validations/split'

// GET — budget cycles for a (business) group, with spend + contribution rollups.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getGroupAccess(params.id, userId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const cycles = await prisma.splitBudgetCycle.findMany({
    where: { groupId: params.id },
    include: {
      expenses: { select: { amount: true } },
      contributions: true,
    },
    orderBy: { startDate: 'desc' },
  })

  return NextResponse.json({
    cycles: cycles.map((c) => {
      const spent = c.expenses.reduce((s, e) => s + e.amount, 0)
      const contributed = c.contributions.reduce((s, x) => s + x.paidAmount, 0)
      return {
        id: c.id,
        name: c.name,
        startDate: c.startDate,
        endDate: c.endDate,
        totalBudget: c.totalBudget,
        status: c.status,
        spent,
        contributed,
        contributions: c.contributions.map((x) => ({
          id: x.id,
          memberId: x.memberId,
          requiredAmount: x.requiredAmount,
          paidAmount: x.paidAmount,
          status: x.status,
        })),
      }
    }),
  })
}

// POST — create a budget cycle (any active member).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getGroupAccess(params.id, userId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const parsed = createCycleSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const cycle = await prisma.splitBudgetCycle.create({
    data: {
      groupId: params.id,
      name: parsed.data.name,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      totalBudget: parsed.data.totalBudget ?? 0,
      status: parsed.data.status ?? 'active',
    },
  })
  return NextResponse.json({ id: cycle.id, name: cycle.name }, { status: 201 })
}
