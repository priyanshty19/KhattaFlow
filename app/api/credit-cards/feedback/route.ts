export const dynamic = 'force-dynamic'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface FeedbackBody {
  liked: boolean
  preferredCard?: string
  recommendedCards: string[]
  month: string
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as FeedbackBody

  if (typeof body.liked !== 'boolean') {
    return NextResponse.json({ error: 'liked is required (boolean)' }, { status: 400 })
  }

  await prisma.cardRecommendationFeedback.create({
    data: {
      userId,
      liked: body.liked,
      preferredCard: body.preferredCard ?? null,
      recommendedCards: body.recommendedCards ?? [],
      month: body.month ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    },
  })

  return NextResponse.json({ ok: true })
}
