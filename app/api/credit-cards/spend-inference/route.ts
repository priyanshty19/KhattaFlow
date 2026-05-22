export const dynamic = 'force-dynamic'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { buildSpendDistributionFromTransactions } from '@/lib/utils/spend-inference'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await buildSpendDistributionFromTransactions(userId, 3)
  return NextResponse.json(result)
}
