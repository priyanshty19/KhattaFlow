export const dynamic = 'force-dynamic'
// app/api/split/groups/[id]/invite-link/route.ts
// First-class, shareable *group* invite link (not tied to a specific recipient).
// Any active member can fetch it; whoever opens the link and signs in joins the
// group via the shared accept handler. Reuses a single non-expired group-level
// invite (identified by an empty email) so re-sharing yields a stable URL.
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getGroupAccess } from '@/lib/utils/split-access'
import { getBaseUrl } from '@/lib/utils/base-url'

const INVITE_TTL_DAYS = 30

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getGroupAccess(params.id, userId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = new Date()
  let invite = await prisma.splitInvite.findFirst({
    where: { groupId: params.id, email: '', status: 'pending', expiresAt: { gt: now } },
    orderBy: { createdAt: 'desc' },
    select: { token: true },
  })

  if (!invite) {
    invite = await prisma.splitInvite.create({
      data: {
        groupId: params.id,
        email: '', // group-level link, no specific recipient
        invitedById: userId,
        expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
      select: { token: true },
    })
  }

  const inviteUrl = `${getBaseUrl(req)}/split/invite/${invite.token}`
  return NextResponse.json({ inviteUrl })
}
