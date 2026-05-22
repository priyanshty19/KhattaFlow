export const dynamic = 'force-dynamic'
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { CategoryTemplate } from '@/constants/categories'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { salary, savingsGoalPct, categories, companyName, investmentStyle, creditScore } = body as {
    salary?: number
    savingsGoalPct: number
    categories: CategoryTemplate[]
    companyName?: string
    investmentStyle?: string
    creditScore?: number
  }

  const clerkUser = await currentUser()
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? ''

  // Remove any orphaned record with the same email but a different Clerk ID
  if (email) {
    await prisma.user.deleteMany({ where: { email, id: { not: userId } } })
  }

  await prisma.$transaction(async (tx) => {
    // Upsert user record
    await tx.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email,
        name: clerkUser?.fullName ?? null,
        monthlySalary: salary ?? null,
        savingsGoalPct,
        companyName: companyName ?? null,
        investmentStyle: investmentStyle ?? null,
        creditScore: creditScore ?? null,
      },
      update: {
        monthlySalary: salary ?? null,
        savingsGoalPct,
        companyName: companyName ?? null,
        investmentStyle: investmentStyle ?? null,
        ...(creditScore !== undefined && { creditScore }),
      },
    })

    // Delete any existing categories (re-onboarding support)
    await tx.category.deleteMany({ where: { userId } })

    // Create selected categories
    await tx.category.createMany({
      data: categories.map(c => ({
        userId,
        name: c.name,
        slug: c.slug,
        type: c.type as any,
        color: c.color,
        isFixed: c.isFixed,
        isSystem: c.isSystem,
        sortOrder: c.sortOrder,
        group: c.group,
      })),
    })
  })

  return NextResponse.json({ ok: true })
}
