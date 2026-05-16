import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const allowed = ['group', 'name', 'color', 'type', 'icon', 'isFixed'] as const
  const data: Record<string, string | boolean | null> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  const result = await prisma.category.updateMany({
    where: { id: params.id, userId },
    data,
  })

  if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership
  const category = await prisma.category.findFirst({
    where: { id: params.id, userId },
  })
  if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Hard-delete all transactions in this category, then the category itself
  await prisma.$transaction([
    prisma.transaction.deleteMany({ where: { categoryId: params.id, userId } }),
    prisma.budget.deleteMany({ where: { categoryId: params.id, userId } }),
    prisma.category.delete({ where: { id: params.id } }),
  ])

  return NextResponse.json({ ok: true })
}
