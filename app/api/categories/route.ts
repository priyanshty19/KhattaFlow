export const dynamic = 'force-dynamic'
// app/api/categories/route.ts
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rekeyUserByEmail } from '@/lib/services/user-keying'
import { DEFAULT_CATEGORIES } from '@/constants/categories'

export async function GET(_req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Count only non-deleted categories — this is what the user actually sees
  const existing = await prisma.category.count({ where: { userId, deletedAt: null } })
  if (existing === 0) {
    // Wrap the whole seed branch defensively so a transient/edge failure here can
    // never 500 the categories endpoint — worst case the user gets an empty list
    // and the next request retries.
    try {
      const clerkUser = await currentUser()
      const email = clerkUser?.emailAddresses[0]?.emailAddress ?? ''

      // If a prior Clerk user shares this email (dev→prod switch, account re-creation),
      // re-key their data onto the current userId instead of colliding on User.email
      // (@unique). This both fixes the historical 500 and restores the user's real data.
      await rekeyUserByEmail({ userId, email })

      // Ensure the current user row exists. After re-keying there is no email collision,
      // so this upsert is safe.
      await prisma.user.upsert({
        where: { id: userId },
        create: { id: userId, email, name: clerkUser?.fullName ?? null, savingsGoalPct: 0.20 },
        update: {},
      })

      // ALWAYS re-count live categories before deciding to seed. The user may already
      // have categories from a re-key OR from a concurrent onboarding write that renamed
      // their row first. Seeding defaults only when genuinely empty prevents clobbering
      // an onboarding selection (the "showed last time's selection" bug).
      const liveCount = await prisma.category.count({ where: { userId, deletedAt: null } })
      if (liveCount === 0) {
        await prisma.category.createMany({
          data: DEFAULT_CATEGORIES.map(c => ({ ...c, userId, type: c.type as any })),
          skipDuplicates: true,
        })
      }
    } catch (e) {
      console.error('[categories auto-seed] failed:', e)
    }
  } else {
    // One-time migration: backfill groups only for system/default categories that
    // have never had a group set AND have not been manually ungrouped by the user.
    // We detect "never migrated" by checking if ALL system categories still lack a group
    // (i.e., the user was seeded before the group field was introduced).
    const systemSlugs = DEFAULT_CATEGORIES.filter(c => c.group).map(c => c.slug)
    const alreadyMigrated = await prisma.category.count({
      where: { userId, slug: { in: systemSlugs }, group: { not: null } },
    })
    if (alreadyMigrated === 0) {
      // First time seeing this user after groups were added — safe to backfill
      const groupMap: Record<string, string> = {}
      for (const c of DEFAULT_CATEGORIES) if (c.group) groupMap[c.slug] = c.group
      const needsMigration = await prisma.category.findMany({
        where: { userId, slug: { in: systemSlugs }, group: null },
      })
      const updates = needsMigration.map(c =>
        prisma.category.update({ where: { id: c.id }, data: { group: groupMap[c.slug] } })
      )
      if (updates.length > 0) await Promise.all(updates)
    }
    // If alreadyMigrated > 0, at least one system category has a group — migration done.
    // Any remaining null groups are intentional (user removed them). Don't touch.
  }

  const categories = await prisma.category.findMany({
    where: { userId, deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json(categories)
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))

  // Custom category creation
  if (body.name) {
    const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const uniqueSlug = `${slug}-${Date.now()}`
    const category = await prisma.category.create({
      data: {
        userId,
        name: body.name.trim(),
        slug: uniqueSlug,
        type: body.type ?? 'expense',
        color: body.color ?? '#94A3B8',
        icon: body.icon ?? null,
        isFixed: body.isFixed ?? false,
        isSystem: false,
        sortOrder: 99,
      },
    })
    return NextResponse.json(category, { status: 201 })
  }

  // Seed defaults
  const existing = await prisma.category.count({ where: { userId } })
  if (existing > 0) {
    return NextResponse.json({ message: 'Categories already seeded' }, { status: 200 })
  }
  const data = DEFAULT_CATEGORIES.map(c => ({ ...c, userId, type: c.type as any }))
  await prisma.category.createMany({ data })
  const categories = await prisma.category.findMany({ where: { userId }, orderBy: { sortOrder: 'asc' } })
  return NextResponse.json(categories, { status: 201 })
}
