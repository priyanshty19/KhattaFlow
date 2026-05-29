export const dynamic = 'force-dynamic'
// app/api/notifications/route.ts
// GET  → recent notifications for the caller + unread count
// PATCH → mark one ({ id }) or all ({ all: true }) as read
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const LIST_LIMIT = 30

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: LIST_LIMIT,
    }),
    prisma.notification.count({ where: { userId, read: false } }),
  ])

  return NextResponse.json({ notifications, unreadCount })
}

export async function PATCH(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))

  if (body?.all === true) {
    await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } })
    return NextResponse.json({ ok: true })
  }

  if (typeof body?.id === 'string') {
    // scope by userId so a user can only mark their own notifications
    await prisma.notification.updateMany({ where: { id: body.id, userId }, data: { read: true } })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Provide { id } or { all: true }' }, { status: 400 })
}
