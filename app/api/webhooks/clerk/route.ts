import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_CATEGORIES } from '@/constants/categories'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const headerPayload = headers()
  const svix_id        = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: WebhookEvent

  try {
    evt = wh.verify(body, { 'svix-id': svix_id, 'svix-timestamp': svix_timestamp, 'svix-signature': svix_signature }) as WebhookEvent
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (evt.type === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data
    const email = email_addresses[0]?.email_address ?? ''
    const name = [first_name, last_name].filter(Boolean).join(' ') || null

    // Create user
    await prisma.user.upsert({
      where: { id },
      create: { id, email, name },
      update: {},
    })

    // Seed default categories
    const existing = await prisma.category.count({ where: { userId: id } })
    if (existing === 0) {
      await prisma.category.createMany({
        data: DEFAULT_CATEGORIES.map(c => ({ ...c, userId: id, type: c.type as any })),
      })
    }
  }

  // GDPR right to erasure: when a user deletes their Clerk account, remove the DB
  // row so the onDelete: Cascade relations purge all owned data (transactions,
  // budgets, goals, split memberships, notifications, etc.). Idempotent — a missing
  // row is a harmless no-op.
  if (evt.type === 'user.deleted') {
    const id = evt.data.id
    if (id) {
      await prisma.user.deleteMany({ where: { id } })
    }
  }

  return NextResponse.json({ received: true })
}
