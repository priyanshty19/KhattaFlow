export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { CreditCard } from '@/lib/engines/credit-card-engine'

export async function GET() {
  const rows = await prisma.creditCard.findMany({
    where: { isActive: true },
    orderBy: { bank: 'asc' },
  })

  // Shape DB rows into the engine's CreditCard interface
  const cards: CreditCard[] = rows.map(r => ({
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

  return NextResponse.json({ cards }, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300' },
  })
}
