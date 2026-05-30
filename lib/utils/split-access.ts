// lib/utils/split-access.ts
// Authorization helpers for Split & Share group routes.
// Every group handler must verify the caller is an *active member* of the group
// (not just the creator). Destructive ops additionally require role === 'owner'.

import { prisma } from '@/lib/prisma'

export interface GroupAccess {
  groupId: string
  member: { id: string; role: string; status: string; name: string; userId: string | null }
}

/**
 * Resolve the caller's active membership in a group. Returns null when the user
 * is not an active member (caller should respond 403/404 accordingly).
 */
export async function getGroupAccess(groupId: string, userId: string): Promise<GroupAccess | null> {
  const member = await prisma.splitMember.findFirst({
    where: { groupId, userId, status: 'active' },
    select: { id: true, role: true, status: true, name: true, userId: true },
  })
  if (!member) return null
  return { groupId, member }
}

/** True when the caller is an active owner of the group. */
export function isOwner(access: GroupAccess): boolean {
  return access.member.role === 'owner'
}
