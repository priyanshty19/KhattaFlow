export const dynamic = 'force-dynamic'
// app/api/split/groups/[id]/expenses/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getGroupAccess } from '@/lib/utils/split-access'
import { createExpenseSchema } from '@/lib/validations/split'
import { computeShares, type SplitType } from '@/lib/engines/split-engine'
import { createNotifications } from '@/lib/services/notifications'
import { formatINR } from '@/lib/utils/currency'

// GET — expenses for the group (newest first).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getGroupAccess(params.id, userId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const expenses = await prisma.splitExpense.findMany({
    where: { groupId: params.id },
    include: { shares: true, paidBy: { select: { id: true, name: true } } },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json({
    expenses: expenses.map((e) => ({
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
  })
}

// POST — add an expense + its computed shares atomically, then notify other members.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getGroupAccess(params.id, userId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const parsed = createExpenseSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const data = parsed.data

  // Validate payer + participants belong to this group.
  const members = await prisma.splitMember.findMany({
    where: { groupId: params.id },
    select: { id: true, name: true, userId: true },
  })
  const memberIds = new Set(members.map((m) => m.id))
  if (!memberIds.has(data.paidById)) {
    return NextResponse.json({ error: 'payer not in group' }, { status: 400 })
  }
  if (!data.participants.every((p) => memberIds.has(p))) {
    return NextResponse.json({ error: 'participant not in group' }, { status: 400 })
  }

  const shares = computeShares({
    amount: data.amount,
    splitType: data.splitType as SplitType,
    participants: data.participants,
    payerId: data.paidById,
    inputs: data.inputs,
  })

  const expense = await prisma.$transaction(async (tx) => {
    const e = await tx.splitExpense.create({
      data: {
        groupId: params.id,
        cycleId: data.cycleId ?? null,
        description: data.description,
        amount: data.amount,
        paidById: data.paidById,
        category: data.category ?? null,
        date: new Date(data.date),
        splitType: data.splitType,
        notes: data.notes ?? null,
        createdById: userId,
        shares: { create: shares.map((s) => ({ memberId: s.memberId, amount: s.amount })) },
      },
      include: { shares: true },
    })
    await tx.splitGroup.update({ where: { id: params.id }, data: { updatedAt: new Date() } })
    return e
  })

  // Notify every other linked member that an expense was added.
  const group = await prisma.splitGroup.findUnique({ where: { id: params.id }, select: { name: true } })
  const recipients = members.filter((m) => m.userId && m.userId !== userId)
  await createNotifications(
    recipients.map((m) => ({
      userId: m.userId!,
      type: 'split_expense' as const,
      title: `New expense in ${group?.name ?? 'your group'}`,
      body: `${access.member.name} added "${data.description}" — ${formatINR(data.amount)}`,
      link: `/split/${params.id}`,
      groupId: params.id,
    })),
  )

  return NextResponse.json(
    { id: expense.id, shares: expense.shares.map((s) => ({ memberId: s.memberId, amount: s.amount })) },
    { status: 201 },
  )
}
