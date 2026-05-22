// Admin-only status check — confirms whether card data has been seeded.
// To seed: run `npm run db:seed-cards` locally (reads prisma/data/credit-cards.xlsx)
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const secret = req.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const count = await prisma.creditCard.count()
  return NextResponse.json({
    ok: true,
    cardCount: count,
    message: count > 0
      ? `${count} cards in DB. Use npm run db:seed-cards to refresh.`
      : 'No cards seeded yet. Run: npm run db:seed-cards',
  })
}
