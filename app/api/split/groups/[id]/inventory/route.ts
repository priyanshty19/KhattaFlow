export const dynamic = 'force-dynamic'
// app/api/split/groups/[id]/inventory/route.ts
// Inventory items (stock/assets) bought with a business group's pooled funds.
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getGroupAccess } from '@/lib/utils/split-access'
import { createInventoryItemSchema } from '@/lib/validations/split'

// GET — list inventory items for the group.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getGroupAccess(params.id, userId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const items = await prisma.splitInventoryItem.findMany({
    where: { groupId: params.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      quantity: true,
      unitCost: true,
      category: true,
      notes: true,
      cycleId: true,
      createdAt: true,
    },
  })
  return NextResponse.json({ items })
}

// POST — add an inventory item (any active member).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getGroupAccess(params.id, userId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const parsed = createInventoryItemSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const item = await prisma.splitInventoryItem.create({
    data: {
      groupId: params.id,
      name: parsed.data.name,
      quantity: parsed.data.quantity,
      unitCost: parsed.data.unitCost,
      category: parsed.data.category ?? null,
      notes: parsed.data.notes ?? null,
      cycleId: parsed.data.cycleId ?? null,
      createdById: userId,
    },
    select: { id: true, name: true },
  })
  return NextResponse.json(item, { status: 201 })
}
