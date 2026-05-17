export const dynamic = 'force-dynamic'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

    const userRecord = await prisma.user.findUnique({ where: { id: userId } }).catch(e => ({ _err: String(e) }))
    const totalCount = await prisma.category.count({ where: { userId } }).catch(e => -1)
    const visibleCount = await prisma.category.count({ where: { userId, deletedAt: null } }).catch(e => -2)

    const cats = await prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, type: true, slug: true, deletedAt: true },
    }).catch(e => ({ _err: String(e) }))

    return NextResponse.json({ userId, userRecord, totalCount, visibleCount, cats })
  } catch (e) {
    return NextResponse.json({ fatalError: String(e) }, { status: 500 })
  }
}
