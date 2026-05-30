export const dynamic = 'force-dynamic'
// app/api/split/groups/[id]/leave/route.ts
// Leave a group you're a member of. Blocked while you have an outstanding balance
// (Splitwise-style). Owners must delete or hand off the group instead of leaving.
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getGroupAccess } from '@/lib/utils/split-access'
import { computeBalances, applySettlements } from '@/lib/engines/split-engine'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getGroupAccess(params.id, userId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (access.member.role === 'owner') {
    return NextResponse.json(
      { error: 'Owners cannot leave — delete the group instead.' },
      { status: 400 },
    )
  }

  // Compute my outstanding balance (net of recorded settlements).
  const group = await prisma.splitGroup.findUnique({
    where: { id: params.id },
    include: {
      expenses: { select: { paidById: true, shares: { select: { memberId: true, amount: true } } } },
      settlements: { where: { isSettled: true }, select: { fromMemberId: true, toMemberId: true, amount: true } },
    },
  })
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const balances = applySettlements(
    computeBalances(group.expenses.map((e) => ({ paidById: e.paidById, shares: e.shares }))),
    group.settlements,
  )
  const myNet = balances.find((b) => b.memberId === access.member.id)?.net ?? 0
  if (myNet !== 0) {
    return NextResponse.json(
      { error: 'Settle up your balance before leaving the group.' },
      { status: 400 },
    )
  }

  // Preserve historical shares: if I have expense history, just unlink my user
  // (drops the group off my list) rather than deleting the member row.
  const history = await prisma.splitMember.findFirst({
    where: { id: access.member.id },
    include: { _count: { select: { paidExpenses: true, shares: true } } },
  })
  const hasHistory = !!history && (history._count.paidExpenses > 0 || history._count.shares > 0)

  if (hasHistory) {
    await prisma.splitMember.update({
      where: { id: access.member.id },
      data: { userId: null, status: 'left' },
    })
  } else {
    await prisma.splitMember.delete({ where: { id: access.member.id } })
  }

  return NextResponse.json({ ok: true })
}
