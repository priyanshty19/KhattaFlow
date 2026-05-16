// app/(dashboard)/layout.tsx
import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { prisma } from '@/lib/prisma'
import { DEFAULT_CATEGORIES } from '@/constants/categories'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Ensure user record exists and has categories
  const categoryCount = await prisma.category.count({ where: { userId } })
  if (categoryCount === 0) {
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
      skipDuplicates: true,
    })
  }

  return <AppShell>{children}</AppShell>
}
