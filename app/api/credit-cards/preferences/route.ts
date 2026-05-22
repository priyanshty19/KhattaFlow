export const dynamic = 'force-dynamic'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pref = await prisma.creditCardPreference.findUnique({ where: { userId } })
  return NextResponse.json(pref ?? { joiningFeePreference: 'no_concern', preferredBanks: [] })
}

export async function PUT(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { joiningFeePreference, preferredBanks } = await req.json() as {
    joiningFeePreference: string
    preferredBanks: string[]
  }

  const pref = await prisma.creditCardPreference.upsert({
    where: { userId },
    create: { userId, joiningFeePreference, preferredBanks },
    update: { joiningFeePreference, preferredBanks },
  })

  return NextResponse.json(pref)
}
