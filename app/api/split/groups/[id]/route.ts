export const dynamic = 'force-dynamic'
// app/api/split/groups/[id]/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getGroupAccess, isOwner } from '@/lib/utils/split-access'
import { updateGroupSchema } from '@/lib/validations/split'
import { computeBalances, minimizeSettlements, applySettlements } from '@/lib/engines/split-engine'

// GET — full group detail: members, expenses, computed balances + suggested transfers.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getGroupAccess(params.id, userId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const group = await prisma.splitGroup.findUnique({
    where: { id: params.id },
    include: {
      members: { orderBy: { createdAt: 'asc' } },
      expenses: {
        include: { shares: true, paidBy: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' },
      },
      settlements: { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const grossBalances = computeBalances(
    group.expenses.map((e) => ({ paidById: e.paidById, shares: e.shares })),
  )

  // Net out any recorded (settled) transfers so balances, the home card, and the
  // settlement suggestions all reflect the same outstanding position.
  const recorded = group.settlements
    .filter((s) => s.isSettled)
    .map((s) => ({ fromMemberId: s.fromMemberId, toMemberId: s.toMemberId, amount: s.amount }))
  const balances = applySettlements(grossBalances, recorded)
  const suggestions = minimizeSettlements(balances.map((b) => ({ memberId: b.memberId, net: b.net })))

  return NextResponse.json({
    id: group.id,
    name: group.name,
    type: group.type,
    currency: group.currency,
    createdById: group.createdById,
    myMemberId: access.member.id,
    myRole: access.member.role,
    members: group.members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      status: m.status,
      role: m.role,
      userId: m.userId,
    })),
    expenses: group.expenses.map((e) => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      paidById: e.paidById,
      paidByName: e.paidBy.name,
      category: e.category,
      date: e.date,
      splitType: e.splitType,
      notes: e.notes,
      cycleId: e.cycleId,
      createdAt: e.createdAt,
      shares: e.shares.map((s) => ({ memberId: s.memberId, amount: s.amount })),
    })),
    balances,
    suggestions,
    settlements: group.settlements.map((s) => ({
      id: s.id,
      fromMemberId: s.fromMemberId,
      toMemberId: s.toMemberId,
      amount: s.amount,
      isSettled: s.isSettled,
      settledAt: s.settledAt,
      note: s.note,
      createdAt: s.createdAt,
    })),
  })
}

// PATCH — rename group (owner only).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getGroupAccess(params.id, userId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!isOwner(access)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const parsed = updateGroupSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const group = await prisma.splitGroup.update({ where: { id: params.id }, data: parsed.data })
  return NextResponse.json({ id: group.id, name: group.name })
}

// DELETE — remove group (owner only). Cascades members/expenses/etc.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getGroupAccess(params.id, userId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!isOwner(access)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.splitGroup.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
