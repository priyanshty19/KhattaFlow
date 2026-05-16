export const dynamic = 'force-dynamic'
// app/api/categories/route.ts
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_CATEGORIES } from '@/constants/categories'

export async function GET(_req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.category.count({ where: { userId } })
  if (existing === 0) {
    const clerkUser = await currentUser()
    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: clerkUser?.emailAddresses[0]?.emailAddress ?? '',
        name: clerkUser?.fullName ?? null,
        savingsGoalPct: 0.20,
      },
      update: {},
    })
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map(c => ({ ...c, userId, type: c.type as any })),
    })
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
