export const dynamic = 'force-dynamic'
// app/api/split/groups/[id]/members/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getGroupAccess } from '@/lib/utils/split-access'
import { inviteMemberSchema } from '@/lib/validations/split'
import { getBaseUrl } from '@/lib/utils/base-url'
import { sendSplitInviteEmail } from '@/lib/services/email'
import { rateLimit, rateLimitKey } from '@/lib/utils/rate-limit'

const INVITE_TTL_DAYS = 14

// GET — list members of the group.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getGroupAccess(params.id, userId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const members = await prisma.splitMember.findMany({
    where: { groupId: params.id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, email: true, status: true, role: true, userId: true },
  })
  return NextResponse.json({ members })
}

// POST — invite a member by email: pending member + invite token + email.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Invite-spam guard (matters once Resend email is live) — cap invites per user.
  const rl = rateLimit(rateLimitKey(req, 'split-invite', userId), { limit: 15, windowMs: 60_000 })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many invites. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } },
    )
  }

  const access = await getGroupAccess(params.id, userId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const parsed = inviteMemberSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const email = parsed.data.email.toLowerCase().trim()
  const group = await prisma.splitGroup.findUnique({ where: { id: params.id }, select: { name: true } })
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Don't double-invite an existing active/pending member with this email.
  const existing = await prisma.splitMember.findFirst({
    where: { groupId: params.id, email },
    select: { id: true, status: true },
  })

  const member =
    existing ??
    (await prisma.splitMember.create({
      data: {
        groupId: params.id,
        name: parsed.data.name ?? email.split('@')[0],
        email,
        status: 'pending',
        role: 'member',
      },
      select: { id: true, status: true },
    }))

  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)
  const invite = await prisma.splitInvite.create({
    data: { groupId: params.id, email, invitedById: userId, expiresAt },
    select: { token: true },
  })

  const inviteUrl = `${getBaseUrl(req)}/split/invite/${invite.token}`
  const inviterName = access.member.name || 'A MyFinGrid user'
  let emailSent = false
  try {
    emailSent = await sendSplitInviteEmail({ to: email, groupName: group.name, inviterName, inviteUrl })
  } catch (err) {
    // Email is best-effort; surface the link regardless so the inviter can share it.
    console.error('[split] invite email failed:', err)
  }

  return NextResponse.json({ memberId: member.id, inviteUrl, emailSent }, { status: 201 })
}
