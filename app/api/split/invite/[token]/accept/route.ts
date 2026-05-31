export const dynamic = 'force-dynamic'
// app/api/split/invite/[token]/accept/route.ts
// Accept a Split & Share invite. Idempotent and safe to re-call.
//   - NEW MyFinGrid user (no users row yet): link membership → deep-link into the group.
//   - EXISTING user: link membership + create a notification → land on the dashboard.
// Does NOT touch the onboarding email-migration re-key/delete logic.
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/services/notifications'

export async function POST(_req: Request, { params }: { params: { token: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const invite = await prisma.splitInvite.findUnique({
    where: { token: params.token },
    include: { group: { select: { id: true, name: true } } },
  })
  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })

  const groupId = invite.groupId

  // Already a member of this group? Idempotent success.
  const alreadyMember = await prisma.splitMember.findFirst({
    where: { groupId, userId, status: 'active' },
    select: { id: true },
  })
  if (alreadyMember) {
    return NextResponse.json({ redirect: `/split/${groupId}`, status: 'already_member' })
  }

  if (invite.status === 'expired' || invite.expiresAt < new Date()) {
    if (invite.status !== 'expired') {
      await prisma.splitInvite.update({ where: { id: invite.id }, data: { status: 'expired' } })
    }
    return NextResponse.json({ error: 'This invite has expired' }, { status: 410 })
  }

  // Decide new-vs-existing BEFORE creating the users row.
  const existingUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  const isNewUser = !existingUser

  // We need the Clerk profile for the display name in several branches.
  const clerkUser = await currentUser()

  // Ensure a users row exists (keyed by Clerk userId) so the membership FK resolves.
  if (isNewUser) {
    await prisma.user.create({
      data: {
        id: userId,
        email: clerkUser?.emailAddresses[0]?.emailAddress ?? `${userId}@placeholder.local`,
        name: clerkUser?.fullName ?? null,
      },
    })
  }

  // Link the pending membership (or create one) for this group.
  // A group-level link has an empty email — never match it to a specific pending
  // member, so always create a fresh membership for the joiner in that case.
  const inviteEmail = invite.email.toLowerCase().trim()
  const pending = inviteEmail
    ? await prisma.splitMember.findFirst({
        where: { groupId, status: 'pending', email: inviteEmail },
        orderBy: { createdAt: 'asc' },
      })
    : null

  const displayName =
    pending?.name ??
    clerkUser?.fullName ??
    clerkUser?.emailAddresses[0]?.emailAddress?.split('@')[0] ??
    (inviteEmail ? inviteEmail.split('@')[0] : 'Member')

  if (pending) {
    await prisma.splitMember.update({
      where: { id: pending.id },
      data: { userId, status: 'active', email: pending.email ?? inviteEmail },
    })
  } else {
    await prisma.splitMember.create({
      data: {
        groupId,
        userId,
        name: displayName,
        email: inviteEmail || clerkUser?.emailAddresses[0]?.emailAddress || null,
        status: 'active',
        role: 'member',
      },
    })
  }

  await prisma.splitInvite.update({
    where: { id: invite.id },
    data: { status: 'accepted', acceptedById: userId },
  })

  if (isNewUser) {
    // Deep-link straight into the group; skip the normal onboarding/dashboard landing.
    return NextResponse.json({ redirect: `/split/${groupId}`, status: 'joined_new' })
  }

  // Existing user → notify + land on dashboard where the notification is visible.
  await createNotification({
    userId,
    type: 'split_added',
    title: `You joined "${invite.group.name}"`,
    body: 'Tap to view the group and start splitting expenses.',
    link: `/split/${groupId}`,
    groupId,
  })
  return NextResponse.json({ redirect: '/', status: 'joined_existing' })
}
