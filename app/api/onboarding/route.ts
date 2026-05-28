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

  // Migrate data from any prior Clerk user with the same email (e.g. dev→prod switch).
  // Instead of deleting the old record (which would cascade-delete all transactions),
  // we re-key every child row to the new userId, then remove the now-empty old user shell.
  if (email) {
    const oldUsers = await prisma.user.findMany({
      where: { email, id: { not: userId } },
      select: { id: true },
    })

    for (const old of oldUsers) {
      const oldId = old.id
      // Re-key every child table that uses userId as a plain string column
      await prisma.$transaction([
        prisma.$executeRaw`UPDATE categories          SET "userId" = ${userId} WHERE "userId" = ${oldId}`,
        prisma.$executeRaw`UPDATE transactions        SET "userId" = ${userId} WHERE "userId" = ${oldId}`,
        prisma.$executeRaw`UPDATE budgets             SET "userId" = ${userId} WHERE "userId" = ${oldId}`,
        prisma.$executeRaw`UPDATE recurring_rules     SET "userId" = ${userId} WHERE "userId" = ${oldId}`,
        prisma.$executeRaw`UPDATE imports             SET "userId" = ${userId} WHERE "userId" = ${oldId}`,
        prisma.$executeRaw`UPDATE monthly_summaries   SET "userId" = ${userId} WHERE "userId" = ${oldId}`,
        prisma.$executeRaw`UPDATE otp_verifications   SET "userId" = ${userId} WHERE "userId" = ${oldId}`,
        prisma.$executeRaw`UPDATE oauth_connections   SET "userId" = ${userId} WHERE "userId" = ${oldId}`,
        prisma.$executeRaw`UPDATE email_import_logs   SET "userId" = ${userId} WHERE "userId" = ${oldId}`,
        prisma.$executeRaw`UPDATE credit_card_preferences SET "userId" = ${userId} WHERE "userId" = ${oldId}`,
        prisma.$executeRaw`UPDATE card_recommendations    SET "userId" = ${userId} WHERE "userId" = ${oldId}`,
        prisma.$executeRaw`UPDATE card_recommendation_feedback SET "userId" = ${userId} WHERE "userId" = ${oldId}`,
        prisma.$executeRaw`UPDATE card_apply_intents  SET "userId" = ${userId} WHERE "userId" = ${oldId}`,
        prisma.$executeRaw`UPDATE user_credit_cards   SET "userId" = ${userId} WHERE "userId" = ${oldId}`,
        // Now the old shell has no children — safe to delete
        prisma.user.delete({ where: { id: oldId } }),
      ])
    }
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
