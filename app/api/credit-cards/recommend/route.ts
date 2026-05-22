export const dynamic = 'force-dynamic'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { FunnelRecommendationEngine, type UserProfile, type CreditCard } from '@/lib/engines/credit-card-engine'
import { buildSpendDistributionFromTransactions } from '@/lib/utils/spend-inference'
import { toRupees } from '@/lib/utils/currency'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    overrideSpend?: Record<string, number>
    creditScore?: number
    monthlyIncome?: number
    joiningFeePreference?: string
    preferredBanks?: string[]
  }

  // Load user + preferences from DB
  const [user, pref, cardRows] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { monthlySalary: true, creditScore: true } }),
    prisma.creditCardPreference.findUnique({ where: { userId } }),
    prisma.creditCard.findMany({ where: { isActive: true } }),
  ])

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Infer spend from transaction history
  const inferred = await buildSpendDistributionFromTransactions(userId, 3)

  // Merge: provided overrideSpend takes priority over auto-inferred
  const spendDistribution: Record<string, number> =
    body.overrideSpend && Object.keys(body.overrideSpend).length > 0
      ? body.overrideSpend
      : inferred.spendDistribution

  const totalMonthlySpend = Object.values(spendDistribution).reduce((a, b) => a + b, 0)
  const spendSource = body.overrideSpend && Object.keys(body.overrideSpend).length > 0
    ? 'manual'
    : inferred.source === 'auto' ? 'auto' : 'manual'

  const joiningFeePreference = (body.joiningFeePreference ?? pref?.joiningFeePreference ?? 'no_concern') as UserProfile['joiningFeePreference']
  const preferredBanks = body.preferredBanks ?? pref?.preferredBanks ?? []
  const creditScore = body.creditScore ?? user.creditScore ?? 700
  // Use form-provided income if supplied, otherwise fall back to profile
  const monthlyIncome = body.monthlyIncome && body.monthlyIncome > 0
    ? body.monthlyIncome
    : user.monthlySalary ? toRupees(user.monthlySalary) : 50000

  const userProfile: UserProfile = {
    monthlyIncome,
    creditScore,
    spendingCategories: Object.keys(spendDistribution),
    joiningFeePreference,
    preferredBrands: preferredBanks,
    spendDistribution,
    totalMonthlySpend,
    totalAnnualSpend: totalMonthlySpend * 12,
  }

  // Shape DB rows into engine's CreditCard type
  const allCards: CreditCard[] = cardRows.map(r => ({
    id: r.id,
    cardName: r.cardName,
    bank: r.bank,
    cardType: r.cardType,
    creditScoreRequirement: r.creditScoreRequirement,
    monthlyIncomeRequirement: r.monthlyIncomeRequirement,
    joiningFee: r.joiningFee,
    annualFee: r.annualFee,
    feeWaiverThreshold: r.feeWaiverThreshold,
    rewardType: r.rewardType as CreditCard['rewardType'],
    pointValue: r.pointValue,
    baseRewardRate: r.baseRewardRate,
    categoryRewardRates: (r.categoryRewardRates as Record<string, number>) ?? {},
    categoryCaps: (r.categoryCaps as Record<string, number>) ?? {},
    signUpBonus: r.signUpBonus,
    signUpSpendRequired: r.signUpSpendRequired,
    signUpWindowDays: r.signUpWindowDays,
    milestoneDependency: r.milestoneDependency,
    minAnnualSpend: r.minAnnualSpend,
    milestoneBonus: r.milestoneBonus,
    milestoneBenefitDesc: r.milestoneBenefitDesc ?? '',
    loungeAccess: r.loungeAccess as CreditCard['loungeAccess'],
    loungeVisitsPerYear: r.loungeVisitsPerYear,
    forexMarkup: r.forexMarkup,
    fuelSurchargeWaiver: r.fuelSurchargeWaiver,
    bestForTags: r.bestForTags,
    features: r.features ?? '',
    spendingCategories: r.spendingCategories,
    // v3 fields
    platformCoverage: r.platformCoverage,
    platformNote: r.platformNote ?? undefined,
    loungeValuePerVisit: r.loungeValuePerVisit,
    milestones: (r.milestones as unknown as import('@/lib/engines/credit-card-engine').MilestoneTier[]) ?? [],
    networkType: r.networkType,
    employmentRequirement: r.employmentRequirement,
    applyUrl: r.applyUrl ?? undefined,
    imageUrl: r.imageUrl ?? undefined,
  }))

  if (allCards.length === 0) {
    return NextResponse.json({ error: 'No card data available. Please seed the database.' }, { status: 503 })
  }

  const result = FunnelRecommendationEngine.processFunnel(allCards, userProfile)

  // Cache the result
  const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  await prisma.cardRecommendation.upsert({
    where: { userId_month: { userId, month } },
    create: {
      userId,
      month,
      recommendations: result.finalRecommendations as any,
      userSnapshot: userProfile as any,
      spendSource,
    },
    update: {
      recommendations: result.finalRecommendations as any,
      userSnapshot: userProfile as any,
      spendSource,
      computedAt: new Date(),
    },
  })

  return NextResponse.json({ ...result, spendSource, userProfile })
}
