export const dynamic = 'force-dynamic'
// app/api/split/groups/[id]/cycles/[cycleId]/contributions/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getGroupAccess } from '@/lib/utils/split-access'
import { upsertContributionSchema } from '@/lib/validations/split'
import { computeContributionStatus, poolObligations } from '@/lib/engines/split-engine'

async function loadCycle(groupId: string, cycleId: string) {
  return prisma.splitBudgetCycle.findFirst({ where: { id: cycleId, groupId } })
}

// GET — contributions for the cycle, each with a freshly-computed status.
export async function GET(
  _req: Request,
  { params }: { params: { id: string; cycleId: string } },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getGroupAccess(params.id, userId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const cycle = await loadCycle(params.id, params.cycleId)
  if (!cycle) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const contributions = await prisma.splitContribution.findMany({
    where: { cycleId: params.cycleId },
    include: { member: { select: { id: true, name: true } } },
  })

  return NextResponse.json({
    contributions: contributions.map((c) => ({
      id: c.id,
      memberId: c.memberId,
      memberName: c.member.name,
      requiredAmount: c.requiredAmount,
      paidAmount: c.paidAmount,
      status: computeContributionStatus({
        requiredAmount: c.requiredAmount,
        paidAmount: c.paidAmount,
        dueDate: cycle.endDate,
      }),
    })),
  })
}

// POST — recompute fair-share obligations: split this cycle's planned budget (or
// actual spend if no budget set) equally across active members.
export async function POST(
  _req: Request,
  { params }: { params: { id: string; cycleId: string } },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getGroupAccess(params.id, userId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const cycle = await prisma.splitBudgetCycle.findFirst({
    where: { id: params.cycleId, groupId: params.id },
    include: { expenses: { select: { amount: true } } },
  })
  if (!cycle) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const members = await prisma.splitMember.findMany({
    where: { groupId: params.id, status: 'active' },
    select: { id: true },
  })
  const spent = cycle.expenses.reduce((s, e) => s + e.amount, 0)
  const total = cycle.totalBudget > 0 ? cycle.totalBudget : spent
  const obligations = poolObligations({ totalAmount: total, memberIds: members.map((m) => m.id) })

  await prisma.$transaction(
    obligations.map((o) =>
      prisma.splitContribution.upsert({
        where: { cycleId_memberId: { cycleId: params.cycleId, memberId: o.memberId } },
        create: { cycleId: params.cycleId, memberId: o.memberId, requiredAmount: o.requiredAmount },
        update: { requiredAmount: o.requiredAmount },
      }),
    ),
  )
  return NextResponse.json({ ok: true, count: obligations.length })
}

// PUT — upsert a single member's contribution (required / paid amounts).
export async function PUT(
  req: Request,
  { params }: { params: { id: string; cycleId: string } },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getGroupAccess(params.id, userId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const cycle = await loadCycle(params.id, params.cycleId)
  if (!cycle) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const parsed = upsertContributionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { memberId, requiredAmount, paidAmount } = parsed.data

  const member = await prisma.splitMember.findFirst({
    where: { id: memberId, groupId: params.id },
    select: { id: true },
  })
  if (!member) return NextResponse.json({ error: 'member not in group' }, { status: 400 })

  const existing = await prisma.splitContribution.findUnique({
    where: { cycleId_memberId: { cycleId: params.cycleId, memberId } },
  })
  const nextRequired = requiredAmount ?? existing?.requiredAmount ?? 0
  const nextPaid = paidAmount ?? existing?.paidAmount ?? 0
  const status = computeContributionStatus({
    requiredAmount: nextRequired,
    paidAmount: nextPaid,
    dueDate: cycle.endDate,
  })

  const contribution = await prisma.splitContribution.upsert({
    where: { cycleId_memberId: { cycleId: params.cycleId, memberId } },
    create: { cycleId: params.cycleId, memberId, requiredAmount: nextRequired, paidAmount: nextPaid, status },
    update: { requiredAmount: nextRequired, paidAmount: nextPaid, status },
  })
  return NextResponse.json({ id: contribution.id, status: contribution.status })
}
