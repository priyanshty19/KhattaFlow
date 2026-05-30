export const dynamic = 'force-dynamic'
// app/api/split/groups/[id]/cycles/[cycleId]/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getGroupAccess } from '@/lib/utils/split-access'
import { updateCycleSchema } from '@/lib/validations/split'

// PATCH — update a budget cycle.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; cycleId: string } },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getGroupAccess(params.id, userId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const cycle = await prisma.splitBudgetCycle.findFirst({
    where: { id: params.cycleId, groupId: params.id },
  })
  if (!cycle) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const parsed = updateCycleSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { startDate, endDate, ...rest } = parsed.data

  const updated = await prisma.splitBudgetCycle.update({
    where: { id: params.cycleId },
    data: {
      ...rest,
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
    },
  })
  return NextResponse.json({ id: updated.id, name: updated.name, status: updated.status })
}

// DELETE — remove a budget cycle (owner only).
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; cycleId: string } },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getGroupAccess(params.id, userId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (access.member.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cycle = await prisma.splitBudgetCycle.findFirst({
    where: { id: params.cycleId, groupId: params.id },
  })
  if (!cycle) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.splitBudgetCycle.delete({ where: { id: params.cycleId } })
  return NextResponse.json({ ok: true })
}
