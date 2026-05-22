export const dynamic = 'force-dynamic'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const card = await prisma.userCreditCard.findUnique({ where: { id } })
  if (!card || card.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.userCreditCard.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
