export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/financial-fetch/prompt-status
 *
 * Returns whether the first-visit Gmail onboarding scan modal should be shown.
 * Conditions: Gmail is connected AND no emails have been imported yet.
 */
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ shouldPrompt: false })

  const conn = await prisma.oAuthConnection.findFirst({
    where: { userId, provider: 'gmail' },
    select: { id: true },
  })
  if (!conn) return NextResponse.json({ shouldPrompt: false })

  const importCount = await prisma.emailImportLog.count({ where: { userId } })
  return NextResponse.json({ shouldPrompt: importCount === 0 })
}
