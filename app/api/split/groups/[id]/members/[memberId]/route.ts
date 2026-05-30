export const dynamic = 'force-dynamic'
// app/api/split/groups/[id]/members/[memberId]/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getGroupAccess, isOwner } from '@/lib/utils/split-access'
import { updateMemberSchema } from '@/lib/validations/split'

// PATCH — rename a member or change role (owner only).
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; memberId: string } },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getGroupAccess(params.id, userId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!isOwner(access)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const parsed = updateMemberSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const member = await prisma.splitMember.findFirst({
    where: { id: params.memberId, groupId: params.id },
  })
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.splitMember.update({
    where: { id: params.memberId },
    data: parsed.data,
  })
  return NextResponse.json({ id: updated.id, name: updated.name, role: updated.role })
}

// DELETE — remove a member (owner only). Blocked when the member has expense
// history to preserve balance integrity.
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; memberId: string } },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getGroupAccess(params.id, userId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!isOwner(access)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const member = await prisma.splitMember.findFirst({
    where: { id: params.memberId, groupId: params.id },
    include: { _count: { select: { paidExpenses: true, shares: true } } },
  })
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (member.role === 'owner') {
    return NextResponse.json({ error: 'Cannot remove the group owner' }, { status: 400 })
  }
  if (member._count.paidExpenses > 0 || member._count.shares > 0) {
    return NextResponse.json(
      { error: 'Member has expense history and cannot be removed' },
      { status: 400 },
    )
  }

  await prisma.splitMember.delete({ where: { id: params.memberId } })
  return NextResponse.json({ ok: true })
}
