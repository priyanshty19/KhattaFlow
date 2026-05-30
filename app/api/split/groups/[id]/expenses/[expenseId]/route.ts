export const dynamic = 'force-dynamic'
// app/api/split/groups/[id]/expenses/[expenseId]/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getGroupAccess } from '@/lib/utils/split-access'
import { updateExpenseSchema } from '@/lib/validations/split'
import { computeShares, type SplitType } from '@/lib/engines/split-engine'

// PATCH — replace an expense's fields + recompute shares atomically.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; expenseId: string } },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getGroupAccess(params.id, userId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const expense = await prisma.splitExpense.findFirst({
    where: { id: params.expenseId, groupId: params.id },
  })
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const parsed = updateExpenseSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const data = parsed.data

  const members = await prisma.splitMember.findMany({
    where: { groupId: params.id },
    select: { id: true },
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

  await prisma.$transaction(async (tx) => {
    await tx.splitExpenseShare.deleteMany({ where: { expenseId: params.expenseId } })
    await tx.splitExpense.update({
      where: { id: params.expenseId },
      data: {
        cycleId: data.cycleId ?? null,
        description: data.description,
        amount: data.amount,
        paidById: data.paidById,
        category: data.category ?? null,
        date: new Date(data.date),
        splitType: data.splitType,
        notes: data.notes ?? null,
        shares: { create: shares.map((s) => ({ memberId: s.memberId, amount: s.amount })) },
      },
    })
  })

  return NextResponse.json({ ok: true })
}

// DELETE — remove an expense (and its shares via cascade).
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; expenseId: string } },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getGroupAccess(params.id, userId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const expense = await prisma.splitExpense.findFirst({
    where: { id: params.expenseId, groupId: params.id },
  })
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.splitExpense.delete({ where: { id: params.expenseId } })
  return NextResponse.json({ ok: true })
}
