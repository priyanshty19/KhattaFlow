export const dynamic = 'force-dynamic'
// app/api/split/groups/[id]/inventory/[itemId]/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getGroupAccess } from '@/lib/utils/split-access'
import { updateInventoryItemSchema } from '@/lib/validations/split'

// PATCH — edit an inventory item (any active member).
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; itemId: string } },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getGroupAccess(params.id, userId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const item = await prisma.splitInventoryItem.findFirst({
    where: { id: params.itemId, groupId: params.id },
    select: { id: true },
  })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const parsed = updateInventoryItemSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const updated = await prisma.splitInventoryItem.update({
    where: { id: params.itemId },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.quantity !== undefined && { quantity: parsed.data.quantity }),
      ...(parsed.data.unitCost !== undefined && { unitCost: parsed.data.unitCost }),
      ...(parsed.data.category !== undefined && { category: parsed.data.category || null }),
      ...(parsed.data.notes !== undefined && { notes: parsed.data.notes || null }),
      ...(parsed.data.cycleId !== undefined && { cycleId: parsed.data.cycleId || null }),
    },
    select: { id: true },
  })
  return NextResponse.json(updated)
}

// DELETE — remove an inventory item (any active member).
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; itemId: string } },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getGroupAccess(params.id, userId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const item = await prisma.splitInventoryItem.findFirst({
    where: { id: params.itemId, groupId: params.id },
    select: { id: true },
  })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.splitInventoryItem.delete({ where: { id: params.itemId } })
  return NextResponse.json({ ok: true })
}
