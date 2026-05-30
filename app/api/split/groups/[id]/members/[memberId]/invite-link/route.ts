export const dynamic = 'force-dynamic'
// app/api/split/groups/[id]/members/[memberId]/invite-link/route.ts
// Retrieve (or mint) a shareable invite link for a pending member, so the
// inviter can copy/re-share it any time — not just at the moment of inviting.
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getGroupAccess } from '@/lib/utils/split-access'
import { getBaseUrl } from '@/lib/utils/base-url'

const INVITE_TTL_DAYS = 14

export async function GET(
  req: Request,
  { params }: { params: { id: string; memberId: string } },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getGroupAccess(params.id, userId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const member = await prisma.splitMember.findFirst({
    where: { id: params.memberId, groupId: params.id },
    select: { id: true, email: true, status: true },
  })
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (member.status !== 'pending') {
    return NextResponse.json({ error: 'Member has already joined' }, { status: 400 })
  }
  if (!member.email) {
    return NextResponse.json({ error: 'Member has no email to invite' }, { status: 400 })
  }

  // Reuse a still-valid pending invite; otherwise mint a fresh one.
  const now = new Date()
  let invite = await prisma.splitInvite.findFirst({
    where: { groupId: params.id, email: member.email, status: 'pending', expiresAt: { gt: now } },
    orderBy: { createdAt: 'desc' },
    select: { token: true },
  })

  if (!invite) {
    invite = await prisma.splitInvite.create({
      data: {
        groupId: params.id,
        email: member.email,
        invitedById: userId,
        expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
      select: { token: true },
    })
  }

  const inviteUrl = `${getBaseUrl(req)}/split/invite/${invite.token}`
  return NextResponse.json({ inviteUrl })
}
