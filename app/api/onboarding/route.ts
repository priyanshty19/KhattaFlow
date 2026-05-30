export const dynamic = 'force-dynamic'
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rekeyUserByEmail } from '@/lib/services/user-keying'
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

  try {
  // Migrate data from any prior Clerk user with the same email (e.g. dev→prod switch).
  // Instead of deleting the old record (which would cascade-delete all transactions),
  // we re-key every child row to the new userId, then remove the now-empty old user shell.
  await rekeyUserByEmail({ userId, email })

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

    // Reconcile categories (re-onboarding support).
    //
    // We CANNOT blanket-delete: Transaction/Budget/RecurringRule reference
    // Category with FK Restrict, so deleting a referenced category throws
    // (this was the onboarding 500). Instead we reconcile by name:
    //   • keep categories whose name is still selected;
    //   • delete the rest, but ONLY if no row references them;
    //   • create only the newly-selected names that don't already exist.
    const incoming = (categories ?? [])
      .filter(c => c?.name?.trim() && c?.slug?.trim())
      .map(c => ({ ...c, name: c.name.trim().slice(0, 40) }))

    const incomingNames = new Set(incoming.map(c => c.name.toLowerCase()))

    const existing = await tx.category.findMany({
      where: { userId },
      select: { id: true, name: true },
    })
    const existingNames = new Set(existing.map(c => c.name.toLowerCase()))

    // Candidates for removal: previously-saved categories no longer selected.
    const removeIds = existing
      .filter(c => !incomingNames.has(c.name.toLowerCase()))
      .map(c => c.id)

    if (removeIds.length) {
      // Skip any category still referenced by a transaction/budget/recurring rule.
      const [txRefs, budgetRefs, ruleRefs] = await Promise.all([
        tx.transaction.findMany({
          where: { userId, categoryId: { in: removeIds } },
          select: { categoryId: true },
          distinct: ['categoryId'],
        }),
        tx.budget.findMany({
          where: { userId, categoryId: { in: removeIds } },
          select: { categoryId: true },
          distinct: ['categoryId'],
        }),
        tx.recurringRule.findMany({
          where: { userId, categoryId: { in: removeIds } },
          select: { categoryId: true },
          distinct: ['categoryId'],
        }),
      ])
      const referenced = new Set(
        [...txRefs, ...budgetRefs, ...ruleRefs].map(r => r.categoryId),
      )
      const deletable = removeIds.filter(id => !referenced.has(id))
      if (deletable.length) {
        await tx.category.deleteMany({ where: { userId, id: { in: deletable } } })
      }
    }

    // Create only the selected categories that don't already exist (by name).
    const toCreate = incoming.filter(c => !existingNames.has(c.name.toLowerCase()))
    if (toCreate.length) {
      await tx.category.createMany({
        data: toCreate.map(c => ({
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
    }
  })

  // Gmail is NOT auto-connected here. Sync is opt-in: the user connects Gmail
  // explicitly from Settings → Connected Accounts, then triggers fetches from the
  // Sync Transactions (Fetch) section. This keeps signup free of the Google
  // gmail.readonly consent screen.

  return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[onboarding] setup failed:', err)
    return NextResponse.json(
      { error: 'Setup failed. Please try again.' },
      { status: 500 },
    )
  }
}
