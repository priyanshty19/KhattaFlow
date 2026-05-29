import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * Make sure a `users` row exists for the current Clerk user before creating
 * records that FK to it (goals, allocations, split groups…). Safe to call in
 * any authenticated route. Does NOT touch the onboarding email-migration path.
 */
export async function ensureUser(userId: string) {
  const existing = await prisma.user.findUnique({ where: { id: userId } })
  if (existing) return existing

  const clerkUser = await currentUser()
  return prisma.user.create({
    data: {
      id: userId,
      email: clerkUser?.emailAddresses[0]?.emailAddress ?? `${userId}@placeholder.local`,
      name: clerkUser?.fullName ?? null,
    },
  })
}
