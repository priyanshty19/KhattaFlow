/**
 * Authentic Indian consumer test profiles for the CredWise recommendation engine.
 * Run: npx tsx scripts/test-recommendations.ts
 *
 * Profiles are sourced from common real-world spending patterns in India:
 *   - NerdWallet India / ET Money / Mint spending surveys
 *   - RBI household finance committee data (2017 — income distribution)
 *   - CardInsider / BankBazaar average spend-per-category data
 */

import { PrismaClient } from '@prisma/client'
import { FunnelRecommendationEngine, type CreditCard, type UserProfile } from '../lib/engines/credit-card-engine'

const prisma = new PrismaClient()

// ── Test profiles ─────────────────────────────────────────────────────────────

const PROFILES: Array<{ name: string; desc: string; profile: UserProfile }> = [
  {
    name: 'Fresh Graduate / Entry-Level',
    desc: 'IT fresher, Bengaluru. Mostly Swiggy, Zomato, Amazon, Netflix. No travel yet.',
    profile: {
      monthlyIncome:     25000,
      creditScore:       700,
      joiningFeePreference: 'no_fee',
      preferredBrands:   [],
      spendingCategories: ['Dining', 'Online Shopping', 'Entertainment', 'Utilities'],
      spendDistribution: {
        Dining:           3000,
        'Online Shopping': 4000,
        Entertainment:    2000,
        Utilities:        1500,
      },
      totalMonthlySpend: 10500,
      totalAnnualSpend:  126000,
    },
  },
  {
    name: 'Mid-Level IT Professional',
    desc: 'Software engineer, ₹75k take-home. Heavy Amazon/Flipkart, Swiggy, OTT subscriptions.',
    profile: {
      monthlyIncome:     75000,
      creditScore:       760,
      joiningFeePreference: 'low_fee',
      preferredBrands:   [],
      spendingCategories: ['Online Shopping', 'Dining', 'Entertainment', 'Utilities', 'Groceries'],
      spendDistribution: {
        'Online Shopping': 15000,
        Dining:            6000,
        Entertainment:     4000,
        Utilities:         3000,
        Groceries:         4000,
      },
      totalMonthlySpend: 32000,
      totalAnnualSpend:  384000,
    },
  },
  {
    name: 'Family Shopper (Salaried, Tier-2 City)',
    desc: 'Government employee, Jaipur. Groceries, fuel, utilities dominate. Occasional online.',
    profile: {
      monthlyIncome:     55000,
      creditScore:       730,
      joiningFeePreference: 'low_fee',
      preferredBrands:   [],
      spendingCategories: ['Groceries', 'Fuel', 'Utilities', 'Online Shopping', 'Healthcare'],
      spendDistribution: {
        Groceries:         8000,
        Fuel:              6000,
        Utilities:         5000,
        'Online Shopping': 5000,
        Healthcare:        3000,
      },
      totalMonthlySpend: 27000,
      totalAnnualSpend:  324000,
    },
  },
  {
    name: 'Frequent Domestic Traveler',
    desc: 'Consultant, Mumbai. Flights every 2–3 weeks, business dining, Uber/Ola, hotel stays.',
    profile: {
      monthlyIncome:     150000,
      creditScore:       800,
      joiningFeePreference: 'no_concern',
      preferredBrands:   [],
      spendingCategories: ['Travel', 'Dining', 'Fuel', 'Entertainment', 'Online Shopping'],
      spendDistribution: {
        Travel:            25000,
        Dining:            10000,
        Fuel:              5000,
        Entertainment:     4000,
        'Online Shopping': 6000,
      },
      totalMonthlySpend: 50000,
      totalAnnualSpend:  600000,
    },
  },
  {
    name: 'International Business Traveler',
    desc: 'Senior manager, frequent flyer. Significant forex spend, premium dining & lounges.',
    profile: {
      monthlyIncome:     250000,
      creditScore:       820,
      joiningFeePreference: 'no_concern',
      preferredBrands:   [],
      spendingCategories: ['Travel', 'International Spends', 'Dining', 'Entertainment'],
      spendDistribution: {
        Travel:               30000,
        'International Spends': 20000,
        Dining:               12000,
        Entertainment:         8000,
      },
      totalMonthlySpend: 70000,
      totalAnnualSpend:  840000,
    },
  },
  {
    name: 'Foodie / Dining Enthusiast',
    desc: 'F&B professional, Delhi NCR. Restaurants, Zomato Gold, PVR movies, Spotify premium.',
    profile: {
      monthlyIncome:     65000,
      creditScore:       745,
      joiningFeePreference: 'low_fee',
      preferredBrands:   [],
      spendingCategories: ['Dining', 'Entertainment', 'Groceries', 'Online Shopping'],
      spendDistribution: {
        Dining:            18000,
        Entertainment:      8000,
        Groceries:          5000,
        'Online Shopping':  4000,
      },
      totalMonthlySpend: 35000,
      totalAnnualSpend:  420000,
    },
  },
  {
    name: 'High Earner — Premium Lifestyle',
    desc: 'Startup founder / senior executive. Everything at premium: fine dining, business class, luxury retail.',
    profile: {
      monthlyIncome:     350000,
      creditScore:       840,
      joiningFeePreference: 'no_concern',
      preferredBrands:   [],
      spendingCategories: ['Dining', 'Travel', 'Online Shopping', 'Entertainment', 'International Spends'],
      spendDistribution: {
        Dining:              30000,
        Travel:              25000,
        'Online Shopping':   20000,
        Entertainment:       15000,
        'International Spends': 10000,
      },
      totalMonthlySpend: 100000,
      totalAnnualSpend:  1200000,
    },
  },
  {
    name: 'Student / Low Income (Credit Builder)',
    desc: 'College student, part-time income. Building credit history. Low spends, no travel.',
    profile: {
      monthlyIncome:     15000,
      creditScore:       660,
      joiningFeePreference: 'no_fee',
      preferredBrands:   [],
      spendingCategories: ['Dining', 'Online Shopping', 'Entertainment'],
      spendDistribution: {
        Dining:             2000,
        'Online Shopping':  2500,
        Entertainment:      1500,
      },
      totalMonthlySpend: 6000,
      totalAnnualSpend:  72000,
    },
  },
  {
    name: 'AMEX Loyalist (Travel + Dining)',
    desc: 'Banking professional, prefers AMEX. Heavy travel + fine dining. Wants premium perks.',
    profile: {
      monthlyIncome:     200000,
      creditScore:       810,
      joiningFeePreference: 'no_concern',
      preferredBrands:   ['American Express'],
      spendingCategories: ['Travel', 'Dining', 'International Spends', 'Entertainment'],
      spendDistribution: {
        Travel:              30000,
        Dining:              15000,
        'International Spends': 12000,
        Entertainment:        6000,
      },
      totalMonthlySpend: 63000,
      totalAnnualSpend:  756000,
    },
  },
  {
    name: 'HDFC Customer (Mixed Spender)',
    desc: 'Bank employee, prefers HDFC ecosystem. Balanced spend across categories.',
    profile: {
      monthlyIncome:     90000,
      creditScore:       775,
      joiningFeePreference: 'low_fee',
      preferredBrands:   ['HDFC'],
      spendingCategories: ['Online Shopping', 'Dining', 'Travel', 'Fuel', 'Groceries'],
      spendDistribution: {
        'Online Shopping': 12000,
        Dining:             6000,
        Travel:             8000,
        Fuel:               4000,
        Groceries:          5000,
      },
      totalMonthlySpend: 35000,
      totalAnnualSpend:  420000,
    },
  },
]

// ── Runner ─────────────────────────────────────────────────────────────────────

const fmt = (n: number) => '₹' + Math.round(Math.abs(n)).toLocaleString('en-IN')
const sign = (n: number) => (n >= 0 ? '+' : '-') + fmt(n)

async function main() {
  const cardRows = await prisma.creditCard.findMany({ where: { isActive: true } })

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
    milestones: (r.milestones as unknown as import('../lib/engines/credit-card-engine').MilestoneTier[]) ?? [],
    networkType: r.networkType,
    employmentRequirement: r.employmentRequirement,
    applyUrl: r.applyUrl ?? undefined,
    imageUrl: r.imageUrl ?? undefined,
  }))

  console.log(`\n${'═'.repeat(80)}`)
  console.log(`  CredWise Recommendation Engine — Test Suite`)
  console.log(`  ${allCards.length} active cards in DB | ${PROFILES.length} test profiles`)
  console.log(`${'═'.repeat(80)}\n`)

  for (const { name, desc, profile } of PROFILES) {
    const result = FunnelRecommendationEngine.processFunnel(allCards, profile)
    const { finalRecommendations: recs, funnelStats: stats, twoTierResult } = result

    const preferredSection = twoTierResult?.preferredBrandCards.length
      ? ` [${twoTierResult.preferredBrandCards.length} preferred-brand picks]`
      : ''

    console.log(`┌─ ${name}`)
    console.log(`│  ${desc}`)
    console.log(`│  Income: ₹${profile.monthlyIncome.toLocaleString('en-IN')}/mo | Score: ${profile.creditScore} | Fee pref: ${profile.joiningFeePreference}`)
    console.log(`│  Spend: ${Object.entries(profile.spendDistribution).map(([k, v]) => `${k} ₹${(v/1000).toFixed(0)}k`).join(' · ')}`)
    console.log(`│  Funnel: ${stats.totalCards} total → ${stats.level1Count} eligible → ${stats.level3Count} after fee → ${stats.finalCount} recommended${preferredSection}`)
    console.log('│')

    if (recs.length === 0) {
      console.log('│  ⚠ No cards recommended (all filtered out)')
    } else {
      recs.slice(0, 5).forEach((s, i) => {
        const tier = s.tier === 'preferred_brand' ? ' ★' : ''
        const envs = sign(s.envsResult.envs)
        const topCat = Object.entries(s.envsResult.categoryBreakdown)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 2)
          .map(([cat, val]) => `${cat.replace(' Shopping', ' Shop')} ${fmt(val)}`)
          .join(' · ')
        const fee = s.envsResult.effectiveAnnualFee === 0 ? 'FREE' : `-${fmt(s.envsResult.effectiveAnnualFee)}`
        console.log(`│  ${i + 1}. ${s.card.cardName}${tier}`)
        console.log(`│     ${envs}/yr net | Rewards ${fmt(s.envsResult.totalAnnualRewards)} | Fee ${fee} | ${topCat}`)
      })
    }

    console.log(`└${'─'.repeat(78)}\n`)
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
