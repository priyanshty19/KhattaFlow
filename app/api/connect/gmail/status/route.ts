export const dynamic = 'force-dynamic'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await prisma.oAuthConnection.findFirst({
    where: { userId, provider: 'gmail' },
    select: { providerEmail: true },
  })

  return NextResponse.json({
    connected: !!conn,
    email: conn?.providerEmail ?? null,
  })
}
