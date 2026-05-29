export const dynamic = 'force-dynamic'
// app/api/split/groups/[id]/settlements/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getGroupAccess } from '@/lib/utils/split-access'
import { createSettlementSchema } from '@/lib/validations/split'
import { computeBalances, minimizeSettlements } from '@/lib/engines/split-engine'
import { createNotification } from '@/lib/services/notifications'
import { formatINR } from '@/lib/utils/currency'

// GET — recorded settlements + freshly computed suggested transfers (net of settled).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getGroupAccess(params.id, userId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [expenses, settlements] = await Promise.all([
    prisma.splitExpense.findMany({ where: { groupId: params.id }, include: { shares: true } }),
    prisma.splitSettlement.findMany({ where: { groupId: params.id }, orderBy: { createdAt: 'desc' } }),
  ])

  const balances = computeBalances(expenses.map((e) => ({ paidById: e.paidById, shares: e.shares })))
  const netMap = new Map(balances.map((b) => [b.memberId, b.net]))
  for (const s of settlements.filter((x) => x.isSettled)) {
    netMap.set(s.fromMemberId, (netMap.get(s.fromMemberId) ?? 0) + s.amount)
    netMap.set(s.toMemberId, (netMap.get(s.toMemberId) ?? 0) - s.amount)
  }
  const suggestions = minimizeSettlements(
    Array.from(netMap.entries()).map(([memberId, net]) => ({ memberId, net })),
  )

  return NextResponse.json({ balances, suggestions, settlements })
}

// POST — record a settlement payment (marks settled) and notify the recipient.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getGroupAccess(params.id, userId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const parsed = createSettlementSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const data = parsed.data

  const members = await prisma.splitMember.findMany({
    where: { groupId: params.id },
    select: { id: true, name: true, userId: true },
  })
  const byId = new Map(members.map((m) => [m.id, m]))
  if (!byId.has(data.fromMemberId) || !byId.has(data.toMemberId)) {
    return NextResponse.json({ error: 'member not in group' }, { status: 400 })
  }

  const settlement = await prisma.splitSettlement.create({
    data: {
      groupId: params.id,
      fromMemberId: data.fromMemberId,
      toMemberId: data.toMemberId,
      amount: data.amount,
      note: data.note ?? null,
      isSettled: true,
      settledAt: new Date(),
    },
  })

  // Notify the receiving member (if linked) that a payment was recorded against them.
  const group = await prisma.splitGroup.findUnique({ where: { id: params.id }, select: { name: true } })
  const from = byId.get(data.fromMemberId)!
  const to = byId.get(data.toMemberId)!
  if (to.userId && to.userId !== userId) {
    await createNotification({
      userId: to.userId,
      type: 'split_settlement',
      title: `${from.name} settled up`,
      body: `${from.name} paid you ${formatINR(data.amount)} in ${group?.name ?? 'your group'}`,
      link: `/split/${params.id}`,
      groupId: params.id,
    })
  }

  return NextResponse.json({ id: settlement.id }, { status: 201 })
}
