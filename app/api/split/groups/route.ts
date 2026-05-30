export const dynamic = 'force-dynamic'
// app/api/split/groups/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/utils/ensure-user'
import { createGroupSchema } from '@/lib/validations/split'
import { computeBalances, applySettlements } from '@/lib/engines/split-engine'

// GET — all groups the caller is an active member of, with their net balance.
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memberships = await prisma.splitMember.findMany({
    where: { userId, status: 'active' },
    select: { groupId: true, id: true },
  })
  const groupIds = memberships.map((m) => m.groupId)
  if (!groupIds.length) return NextResponse.json({ groups: [] })

  const groups = await prisma.splitGroup.findMany({
    where: { id: { in: groupIds } },
    include: {
      members: { select: { id: true, name: true, status: true, userId: true } },
      expenses: { include: { shares: true } },
      settlements: { where: { isSettled: true }, select: { fromMemberId: true, toMemberId: true, amount: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const myMemberIdByGroup = new Map(memberships.map((m) => [m.groupId, m.id]))

  const payload = groups.map((g) => {
    const balances = applySettlements(
      computeBalances(g.expenses.map((e) => ({ paidById: e.paidById, shares: e.shares }))),
      g.settlements,
    )
    const myMemberId = myMemberIdByGroup.get(g.id)
    const myNet = balances.find((b) => b.memberId === myMemberId)?.net ?? 0
    const lastActivity = g.expenses.reduce<Date>(
      (acc, e) => (e.createdAt > acc ? e.createdAt : acc),
      g.updatedAt,
    )
    return {
      id: g.id,
      name: g.name,
      type: g.type,
      currency: g.currency,
      memberCount: g.members.filter((m) => m.status === 'active').length,
      members: g.members.map((m) => ({ id: m.id, name: m.name, status: m.status })),
      myNet,
      expenseCount: g.expenses.length,
      lastActivity,
    }
  })

  return NextResponse.json({ groups: payload })
}

// POST — create a group; auto-add creator as active owner member.
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = createGroupSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const user = await ensureUser(userId)

  const group = await prisma.splitGroup.create({
    data: {
      createdById: userId,
      name: parsed.data.name,
      type: parsed.data.type,
      currency: parsed.data.currency ?? 'INR',
      members: {
        create: {
          userId,
          name: user.name ?? user.email ?? 'You',
          email: user.email,
          status: 'active',
          role: 'owner',
        },
      },
    },
    include: { members: true },
  })

  return NextResponse.json({ id: group.id, name: group.name, type: group.type }, { status: 201 })
}
