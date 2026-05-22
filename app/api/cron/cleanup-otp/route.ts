export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const cronSecret = req.headers.get('x-cron-secret')
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await prisma.otpVerification.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })

  return NextResponse.json({ deleted: result.count })
}
