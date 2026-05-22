// Credit card recommendation engine — FinGrid CredWise v3
// Core algorithm: ENVS (Expected Net Value Score) — ranks cards by ₹ net annual value
//
// v3 improvements over v2:
//  1. platformCoverage — merchant-specific cards (Swiggy, Scapia, Amazon, Flipkart) no longer inflate ENVS
//  2. Lounge value added to ENVS — loungeVisitsPerYear × loungeValuePerVisit
//  3. Forex markup subtracted from ENVS for international spenders
//  4. Fuel surcharge savings added to ENVS for fuel spenders
//  5. Year 1 vs Year 2+ ENVS — separate values; envs now = Year2+ (recurring, conservative)
//  6. Fee waiver achievability — 3-tier ('achieved' | 'near' | 'unlikely') with partial credit at 80%+
//  7. Multiple milestone tiers — reads milestones JSON array, falls back to legacy single fields
//  8. networkType field — display badge in UI
//  9. employmentRequirement eligibility filter
// 10. calcPortfolioComplement — multi-card portfolio optimizer (SaveSage-style)
// 11. spendConfidence weighting — reduces spend estimate reliability discount

export interface MilestoneTier {
  minAnnualSpend: number
  bonus: number
  desc?: string
  type?: 'points' | 'voucher' | 'fee_waiver' | 'cashback'
}

export interface CreditCard {
  id: string
  cardName: string
  bank: string
  cardType: string
  creditScoreRequirement: number
  monthlyIncomeRequirement: number
  joiningFee: number
  annualFee: number
  feeWaiverThreshold: number
  rewardType: 'cashback' | 'points' | 'miles' | 'hybrid'
  pointValue: number
  baseRewardRate: number
  categoryRewardRates: Record<string, number>
  categoryCaps: Record<string, number>
  signUpBonus: number
  signUpSpendRequired: number
  signUpWindowDays: number
  milestoneDependency: boolean
  minAnnualSpend: number
  milestoneBonus: number
  milestoneBenefitDesc: string
  loungeAccess: 'none' | 'domestic' | 'domestic+international' | 'unlimited'
  loungeVisitsPerYear: number
  forexMarkup: number
  fuelSurchargeWaiver: boolean
  bestForTags: string[]
  features: string
  spendingCategories: string[]
  // v3 fields
  platformCoverage: number       // 0.0–1.0: fraction of category spend earning the special rate
  platformNote?: string          // e.g. "Only on Swiggy orders"
  loungeValuePerVisit: number    // ₹ per lounge visit
  milestones: MilestoneTier[]    // multi-tier milestone array (replaces single milestone fields)
  networkType: string            // 'Visa' | 'Mastercard' | 'RuPay' | 'Amex' | 'Diners'
  employmentRequirement: string  // 'any' | 'salaried' | 'self_employed'
  applyUrl?: string
  imageUrl?: string
}

export interface UserProfile {
  monthlyIncome: number
  creditScore: number
  spendingCategories: string[]
  joiningFeePreference: 'no_fee' | 'low_fee' | 'no_concern'
  preferredBrands: string[]
  currentCards?: string
  spendDistribution: Record<string, number>
  totalMonthlySpend: number
  totalAnnualSpend: number
  employmentType?: string  // v3: 'salaried' | 'self_employed' | 'business_owner' | 'student'
  spendConfidence?: Record<string, 'high' | 'medium' | 'low'>  // v3: per-category reliability
}

export interface ENVSResult {
  // Ranking value — now equals envsYear2Plus (conservative recurring value, no signup, no joining fee)
  envs: number
  totalAnnualRewards: number
  // Fee transparency
  annualFeeEffective: number      // annual fee after waiver check (with partial credit if 'near')
  joiningFeeAmortized: number     // joining fee / 3 years (kept for display / breakeven calc)
  effectiveAnnualFee: number      // annualFeeEffective + joiningFeeAmortized (legacy display)
  feeWaiverConfidence: 'achieved' | 'near' | 'unlikely'  // v3
  // Signup bonus
  signUpBonusAmortized: number
  signUpBonusAchievable: boolean
  // Milestone
  milestoneBonus: number
  milestoneAchievable: boolean
  milestoneConfidence: 'high' | 'medium' | 'low'
  milestoneTiersHit: MilestoneTier[]  // v3: which tiers were credited
  // v3 components
  loungeAnnualValue: number          // loungeVisitsPerYear × loungeValuePerVisit
  forexAnnualCost: number            // intl spend × forexMarkup — subtracted from ENVS
  fuelSurchargeAnnualSavings: number // fuelSpend × 0.01 — added to ENVS
  // Year 1 vs Year 2+
  envsYear1: number      // full signup bonus, full joining fee, all other components
  envsYear2Plus: number  // no signup, no joining fee, only annual fee + rewards + lounge + fuel - forex
  // Supporting
  breakEvenMonth: number
  categoryBreakdown: Record<string, number>
  topCategory: string
  isNegativeValue: boolean
  matchPercentage: number
  spendAlignmentScore: number
}

export interface ScoredCard {
  card: CreditCard
  score: number
  envsResult: ENVSResult
  scoreBreakdown: {
    totalRewards: number
    annualFee: number
    joiningFeeAmortized: number
    effectiveFee: number
    milestoneBonus: number
    signUpAmortized: number
  }
  matchPercentage: number
  reasoning: string
  tier?: 'preferred_brand' | 'general'
  incrementalValue?: number  // v3: for portfolio optimizer
}

export interface TwoTierResult {
  preferredBrandCards: ScoredCard[]
  generalCards: ScoredCard[]
  showGeneralMessage: boolean
  finalTop7: ScoredCard[]
}

export interface FunnelResult {
  level1Cards: CreditCard[]
  level2Cards: CreditCard[]
  level3Cards: CreditCard[]
  availableBrands: string[]
  finalRecommendations: ScoredCard[]
  funnelStats: {
    totalCards: number
    level1Count: number
    level2Count: number
    level3Count: number
    finalCount: number
  }
  twoTierResult?: TwoTierResult
}

// v3: Portfolio optimizer result
export interface PortfolioResult {
  existingCards: CreditCard[]
  topComplements: ScoredCard[]  // top 3 best additions ranked by incremental value
  coveredEnvs: number           // ENVS already covered by existing cards (best-card routing)
  gapCategories: string[]       // categories where existing cards earn only base rate
}

// ── Constants ─────────────────────────────────────────────────────────────────

const REWARD_VALUE: Record<string, number> = {
  cashback: 1.0,
  points:   0.25,
  miles:    0.50,
  hybrid:   0.25,
}

// Confidence discount for spend amounts inferred from transactions
const CONFIDENCE_MULTIPLIER: Record<string, number> = {
  high:   1.00,
  medium: 0.90,
  low:    0.75,
}

// ── Core calculation functions ────────────────────────────────────────────────

// Category aliases — legacy spend keys that should resolve to card-native keys
const CATEGORY_ALIASES: Record<string, string> = {
  'Shopping': 'Online Shopping',   // old key before v2; no card stores 'Shopping' rates
}

export function calcCategoryReward(
  spendAmt: number,
  card: CreditCard,
  category: string,
  confidence?: 'high' | 'medium' | 'low',
): number {
  const resolvedCategory = CATEGORY_ALIASES[category] ?? category
  const ratePercent = card.categoryRewardRates[resolvedCategory]
    ?? card.categoryRewardRates[category]
    ?? card.categoryRewardRates['Others']
    ?? card.baseRewardRate

  // v3: apply confidence discount to spend amount
  const confidenceMultiplier = confidence ? (CONFIDENCE_MULTIPLIER[confidence] ?? 1.0) : 1.0
  const effectiveSpend = spendAmt * confidenceMultiplier

  // v3: platformCoverage — merchant-specific cards only earn the bonus rate on the covered fraction
  const coverage = card.platformCoverage ?? 1.0
  const baseRatePct = card.baseRewardRate
  const bonusRatePct = ratePercent - baseRatePct  // extra above base
  const effectiveRatePct = baseRatePct + (bonusRatePct * coverage)

  const cap = card.categoryCaps[resolvedCategory] ?? card.categoryCaps[category] ?? Infinity
  const pv = card.pointValue > 0 ? card.pointValue : (REWARD_VALUE[card.rewardType] ?? 0.25)
  return Math.min(effectiveSpend * (effectiveRatePct / 100), cap / pv) * pv
}

export function calcTotalAnnualRewards(user: UserProfile, card: CreditCard): number {
  let monthlyTotal = 0
  for (const [category, spendAmt] of Object.entries(user.spendDistribution)) {
    const confidence = user.spendConfidence?.[category]
    monthlyTotal += calcCategoryReward(spendAmt, card, category, confidence)
  }
  return monthlyTotal * 12
}

/**
 * Sign-up bonus — only credit it if the user can realistically hit the spend requirement.
 * Amortised over 3 years if achievable.
 */
function calcSignUpBonus(user: UserProfile, card: CreditCard): { amortized: number; achievable: boolean } {
  if (!card.signUpBonus || card.signUpBonus === 0) {
    return { amortized: 0, achievable: false }
  }
  if (card.signUpSpendRequired > 0) {
    const windowMonths = card.signUpWindowDays > 0 ? card.signUpWindowDays / 30 : 3
    const expectedSpend = user.totalMonthlySpend * windowMonths
    if (expectedSpend < card.signUpSpendRequired * 0.8) {
      return { amortized: 0, achievable: false }
    }
  }
  return { amortized: card.signUpBonus / 3, achievable: true }
}

interface MilestoneResult {
  bonus: number
  achievable: boolean
  confidence: 'high' | 'medium' | 'low'
  tiersHit: MilestoneTier[]
}

/**
 * v3: Multi-tier milestone bonus.
 * Reads milestones JSON array if present, falls back to legacy single-milestone fields.
 * 100% credit for each tier reached, 50% partial credit for a tier at 85–99%, stop there.
 */
export function calcMilestoneBonus(user: UserProfile, card: CreditCard): MilestoneResult {
  // Prefer the milestones array if it has entries
  const tiers: MilestoneTier[] = Array.isArray(card.milestones) && card.milestones.length > 0
    ? card.milestones
    : card.minAnnualSpend > 0 && card.milestoneBonus > 0
      ? [{ minAnnualSpend: card.minAnnualSpend, bonus: card.milestoneBonus, desc: card.milestoneBenefitDesc }]
      : []

  if (tiers.length === 0) {
    return { bonus: 0, achievable: false, confidence: 'low', tiersHit: [] }
  }

  // Sort tiers ascending by spend threshold
  const sortedTiers = [...tiers].sort((a, b) => a.minAnnualSpend - b.minAnnualSpend)

  let totalBonus = 0
  const tiersHit: MilestoneTier[] = []
  let overallConfidence: 'high' | 'medium' | 'low' = 'low'

  for (const tier of sortedTiers) {
    const ratio = user.totalAnnualSpend / tier.minAnnualSpend
    if (ratio >= 1) {
      totalBonus += tier.bonus
      tiersHit.push(tier)
      overallConfidence = 'high'
    } else if (ratio >= 0.85) {
      totalBonus += tier.bonus * 0.5
      overallConfidence = overallConfidence === 'high' ? 'high' : 'medium'
      break  // don't credit higher tiers if this one isn't fully hit
    } else {
      break
    }
  }

  return {
    bonus: totalBonus,
    achievable: tiersHit.length > 0 && totalBonus > 0,
    confidence: overallConfidence,
    tiersHit,
  }
}

// v3: Lounge value — counted as real ₹ savings in ENVS
// Lounge caps.
// DB stores 999 as a sentinel for "unlimited" — we cap it at a travel-adjusted realistic count.
// For users who travel heavily, we credit more lounge visits. For non-travellers, very few.
const LOUNGE_UNLIMITED_SENTINEL = 50    // visits > this = treat as "unlimited"
// Realistic annual usage by travel intensity bucket:
const LOUNGE_CAP_NO_TRAVEL    = 4       // non-traveller: maybe a couple trips/year
const LOUNGE_CAP_LIGHT_TRAVEL = 12     // light traveller: ~monthly trips
const LOUNGE_CAP_HEAVY_TRAVEL = 30     // heavy traveller: 2-3×/month

function calcLoungeValue(card: CreditCard, user: UserProfile): number {
  if (card.loungeAccess === 'none' || card.loungeVisitsPerYear === 0) return 0
  const valuePerVisit = (card.loungeValuePerVisit != null && card.loungeValuePerVisit > 0)
    ? card.loungeValuePerVisit
    : 700

  // Scale lounge visits by how much the user actually travels
  const monthlyTravel = (user.spendDistribution['Travel'] ?? 0)
    + (user.spendDistribution['International Spends'] ?? 0)

  let effectiveVisits: number
  if (card.loungeVisitsPerYear > LOUNGE_UNLIMITED_SENTINEL) {
    // Unlimited card — cap based on user's travel intensity
    if (monthlyTravel >= 20000) effectiveVisits = LOUNGE_CAP_HEAVY_TRAVEL      // heavy traveller
    else if (monthlyTravel >= 5000) effectiveVisits = LOUNGE_CAP_LIGHT_TRAVEL  // moderate traveller
    else effectiveVisits = LOUNGE_CAP_NO_TRAVEL                                 // non-traveller
  } else {
    // Fixed visit card — still scale down for non-travellers (they won't use all allotted visits)
    const travelScalar = monthlyTravel >= 15000 ? 1.0
      : monthlyTravel >= 5000 ? 0.7
      : monthlyTravel >= 1000 ? 0.4
      : 0.2  // non-traveller: will use very few of their allotted visits
    effectiveVisits = Math.round(card.loungeVisitsPerYear * travelScalar)
  }

  return effectiveVisits * valuePerVisit
}

// v3: Forex markup cost — subtracted from ENVS for international spenders
function calcForexCost(user: UserProfile, card: CreditCard): number {
  const intlSpend = user.spendDistribution['International Spends'] ?? 0
  if (intlSpend === 0 || card.forexMarkup === 0) return 0
  return intlSpend * 12 * (card.forexMarkup / 100)
}

// v3: Fuel surcharge savings — added to ENVS for fuel spenders
function calcFuelSurchargeSavings(user: UserProfile, card: CreditCard): number {
  if (!card.fuelSurchargeWaiver) return 0
  const fuelSpend = user.spendDistribution['Fuel'] ?? 0
  return fuelSpend * 12 * 0.01  // Standard 1% surcharge waiver
}

/**
 * Spend alignment score (0–100).
 * Measures how well the card's bonus categories match WHERE the user actually spends.
 */
function calcSpendAlignment(user: UserProfile, card: CreditCard): number {
  if (user.totalMonthlySpend === 0) return 0
  let weightedBoost = 0
  for (const [cat, spend] of Object.entries(user.spendDistribution)) {
    const resolvedCat = CATEGORY_ALIASES[cat] ?? cat
    const catRate = card.categoryRewardRates[resolvedCat] ?? card.baseRewardRate
    const baseRate = Math.max(card.baseRewardRate, 0.1)
    const relativeBoost = Math.max(0, (catRate - card.baseRewardRate) / baseRate)
    const spendWeight = spend / user.totalMonthlySpend
    weightedBoost += spendWeight * relativeBoost
  }
  return Math.min(100, Math.round(weightedBoost * 100))
}

/**
 * Match percentage — what % of the user's monthly spend earns above the base reward rate.
 */
function calcMatchPercentage(user: UserProfile, card: CreditCard): number {
  if (user.totalMonthlySpend === 0) return 0
  let bonusSpend = 0
  for (const [cat, spend] of Object.entries(user.spendDistribution)) {
    const resolvedCat = CATEGORY_ALIASES[cat] ?? cat
    const catRate = card.categoryRewardRates[resolvedCat] ?? card.categoryRewardRates[cat]
    if (catRate !== undefined && catRate > card.baseRewardRate) {
      bonusSpend += spend
    }
  }
  return Math.round((bonusSpend / user.totalMonthlySpend) * 100)
}

export function calcENVS(user: UserProfile, card: CreditCard): ENVSResult {
  // Category-level rewards
  const categoryBreakdown: Record<string, number> = {}
  for (const [category, spendAmt] of Object.entries(user.spendDistribution)) {
    const confidence = user.spendConfidence?.[category]
    categoryBreakdown[category] = calcCategoryReward(spendAmt, card, category, confidence) * 12
  }
  const totalAnnualRewards = Object.values(categoryBreakdown).reduce((a, b) => a + b, 0)

  // Milestone bonus (multi-tier with partial credit)
  const { bonus: milestoneBonus, achievable: milestoneAchievable, confidence: milestoneConfidence, tiersHit: milestoneTiersHit } =
    calcMilestoneBonus(user, card)

  // Sign-up bonus (achievability-gated, amortized over 3 years for display)
  const { amortized: signUpBonusAmortized, achievable: signUpBonusAchievable } =
    calcSignUpBonus(user, card)

  // v3: fee waiver achievability — 3-tier with partial credit at 80–99%
  let annualFeeEffective: number
  let feeWaiverConfidence: 'achieved' | 'near' | 'unlikely'
  if (card.feeWaiverThreshold === 0) {
    annualFeeEffective = card.annualFee
    feeWaiverConfidence = 'unlikely'
  } else {
    const ratio = user.totalAnnualSpend / card.feeWaiverThreshold
    if (ratio >= 1) {
      annualFeeEffective = 0
      feeWaiverConfidence = 'achieved'
    } else if (ratio >= 0.8) {
      annualFeeEffective = card.annualFee * 0.5  // optimistic partial credit
      feeWaiverConfidence = 'near'
    } else {
      annualFeeEffective = card.annualFee
      feeWaiverConfidence = 'unlikely'
    }
  }

  const joiningFeeAmortized = card.joiningFee / 3
  const effectiveAnnualFee = annualFeeEffective + joiningFeeAmortized  // kept for display

  // v3: new ENVS components
  const loungeAnnualValue = calcLoungeValue(card, user)
  const forexAnnualCost = calcForexCost(user, card)
  const fuelSurchargeAnnualSavings = calcFuelSurchargeSavings(user, card)

  // v3: Year 1 — full signup bonus, full joining fee, all components
  const envsYear1 = totalAnnualRewards + milestoneBonus
    + (signUpBonusAchievable ? card.signUpBonus : 0)
    + loungeAnnualValue + fuelSurchargeAnnualSavings
    - card.joiningFee - annualFeeEffective - forexAnnualCost

  // v3: Year 2+ — no signup bonus, no joining fee, recurring value only
  const envsYear2Plus = totalAnnualRewards + milestoneBonus
    + loungeAnnualValue + fuelSurchargeAnnualSavings
    - annualFeeEffective - forexAnnualCost

  // envs = Year2+ (conservative recurring value, better for ranking)
  const envs = envsYear2Plus

  // Break-even: months of rewards to cover the joining fee
  const monthlyReward = totalAnnualRewards / 12
  const breakEvenMonth = monthlyReward > 0
    ? Math.ceil(card.joiningFee / monthlyReward)
    : card.joiningFee > 0 ? 999 : 0

  const topCategory = Object.entries(categoryBreakdown).sort(([, a], [, b]) => b - a)[0]?.[0] ?? ''

  return {
    envs,
    totalAnnualRewards,
    annualFeeEffective,
    joiningFeeAmortized,
    effectiveAnnualFee,
    feeWaiverConfidence,
    signUpBonusAmortized,
    signUpBonusAchievable,
    milestoneBonus,
    milestoneAchievable,
    milestoneConfidence,
    milestoneTiersHit,
    loungeAnnualValue,
    forexAnnualCost,
    fuelSurchargeAnnualSavings,
    envsYear1,
    envsYear2Plus,
    breakEvenMonth,
    categoryBreakdown,
    topCategory,
    isNegativeValue: envs < 0,
    matchPercentage: calcMatchPercentage(user, card),
    spendAlignmentScore: calcSpendAlignment(user, card),
  }
}

// ── Reasoning generator ───────────────────────────────────────────────────────

function generateENVSReasoning(card: CreditCard, e: ENVSResult, user: UserProfile): string {
  const fmt = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
  const parts: string[] = []

  // Lead with net value (Year2+ — recurring)
  if (e.envs >= 0) {
    parts.push(`You'll earn ${fmt(e.envs)}/year net (recurring) with this card.`)
  } else {
    parts.push(`This card costs ${fmt(Math.abs(e.envs))} more in fees/forex than it returns in rewards at your spend level.`)
  }

  // Highlight Year 1 premium if meaningful
  if (e.signUpBonusAchievable && card.signUpBonus > 0) {
    const diff = e.envsYear1 - e.envsYear2Plus
    if (diff > 2000) {
      parts.push(`First year value ${fmt(e.envsYear1)} (includes ${fmt(card.signUpBonus)} sign-up bonus).`)
    }
  }

  // Top 2 earning categories
  const topCats = Object.entries(e.categoryBreakdown)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
  if (topCats.length > 0) {
    const catStr = topCats.map(([cat, val]) => `${cat} ${fmt(val)}`).join(', ')
    parts.push(`Top earners: ${catStr}/yr.`)
  }

  // Platform coverage caveat
  if (card.platformCoverage < 1.0 && card.platformNote) {
    parts.push(`Note: Bonus rate applies only via ${card.platformNote}.`)
  }

  // Lounge perk
  if (e.loungeAnnualValue > 0) {
    const pvLounge = (card.loungeValuePerVisit != null && card.loungeValuePerVisit > 0)
      ? card.loungeValuePerVisit : 700
    const effectiveVisits = Math.round(e.loungeAnnualValue / pvLounge)
    const visitStr = card.loungeVisitsPerYear > LOUNGE_UNLIMITED_SENTINEL
      ? `unlimited — ${effectiveVisits} realistic visits × ${fmt(pvLounge)}`
      : `${effectiveVisits} of ${card.loungeVisitsPerYear} visits × ${fmt(pvLounge)}`
    parts.push(`Lounge access worth ${fmt(e.loungeAnnualValue)}/yr (${visitStr}).`)
  }

  // Forex cost warning
  if (e.forexAnnualCost > 1000) {
    parts.push(`Forex markup costs ${fmt(e.forexAnnualCost)}/yr on your international spend.`)
  } else if (e.forexAnnualCost === 0 && (user.spendDistribution['International Spends'] ?? 0) > 0) {
    parts.push('Zero forex markup — great for international transactions.')
  }

  // Fuel surcharge
  if (e.fuelSurchargeAnnualSavings > 0) {
    parts.push(`Fuel surcharge waiver saves ${fmt(e.fuelSurchargeAnnualSavings)}/yr.`)
  }

  // Category hit rate
  if (e.matchPercentage > 0) {
    parts.push(`${e.matchPercentage}% of your spend earns above-base rewards.`)
  }

  // Fee recovery
  if (card.joiningFee > 0) {
    if (e.breakEvenMonth < 999 && e.breakEvenMonth > 0) {
      parts.push(`Joining fee recovered in ${e.breakEvenMonth} month${e.breakEvenMonth !== 1 ? 's' : ''}.`)
    } else {
      parts.push(`Joining fee ${fmt(card.joiningFee)} may not be recovered at current spend.`)
    }
  }

  // Annual fee waiver
  if (card.feeWaiverThreshold > 0) {
    if (e.feeWaiverConfidence === 'achieved') {
      parts.push(`Annual fee waived — you meet the ${fmt(card.feeWaiverThreshold)}/yr spend threshold.`)
    } else if (e.feeWaiverConfidence === 'near') {
      const gap = card.feeWaiverThreshold - user.totalAnnualSpend
      parts.push(`Spend ${fmt(gap)} more/year to waive the ${fmt(card.annualFee)} annual fee.`)
    }
  }

  // Milestone
  if (e.milestoneBonus > 0) {
    if (e.milestoneConfidence === 'high') {
      parts.push(`Milestone bonus ${fmt(e.milestoneBonus)} on track — ${e.milestoneTiersHit.length} tier${e.milestoneTiersHit.length !== 1 ? 's' : ''} hit.`)
    } else if (e.milestoneConfidence === 'medium') {
      const lowestUnhit = (Array.isArray(card.milestones) && card.milestones.length > 0 ? card.milestones : [{ minAnnualSpend: card.minAnnualSpend }])
        .find(t => user.totalAnnualSpend < t.minAnnualSpend)
      const gap = lowestUnhit ? lowestUnhit.minAnnualSpend - user.totalAnnualSpend : 0
      if (gap > 0) parts.push(`Milestone bonus within reach — ${fmt(gap)} more annual spend needed.`)
    }
  }

  return parts.join(' ')
}

// ── Funnel engine ─────────────────────────────────────────────────────────────

export class FunnelRecommendationEngine {
  // v3: employment type eligibility check added
  static level1BasicEligibility(allCards: CreditCard[], userIncome: number, userCreditScore: number, employmentType?: string): CreditCard[] {
    return allCards.filter(card => {
      const meetsIncome = card.monthlyIncomeRequirement === 0 || userIncome >= card.monthlyIncomeRequirement
      const meetsCredit = card.creditScoreRequirement === 0 || userCreditScore >= card.creditScoreRequirement
      // v3: employment filter — only apply when card has a specific requirement AND user has declared their type
      const meetsEmployment = !card.employmentRequirement || card.employmentRequirement === 'any'
        || !employmentType
        || card.employmentRequirement === employmentType
      return meetsIncome && meetsCredit && meetsEmployment
    })
  }

  static level2CategoryFiltering(level1Cards: CreditCard[], _userSpendingCategories: string[]): CreditCard[] {
    // ENVS handles relevance implicitly — pass through
    return level1Cards
  }

  static level3JoiningFeeAndBrandFiltering(
    level2Cards: CreditCard[],
    joiningFeePreference: 'no_fee' | 'low_fee' | 'no_concern',
  ): { level3Cards: CreditCard[]; availableBrands: string[] } {
    let feeFilteredCards: CreditCard[]
    switch (joiningFeePreference) {
      case 'no_fee':
        feeFilteredCards = level2Cards.filter(c => c.joiningFee === 0)
        break
      case 'low_fee':
        feeFilteredCards = level2Cards.filter(c => c.joiningFee <= 1000)
        break
      default:
        feeFilteredCards = level2Cards
    }
    const availableBrands = Array.from(new Set(feeFilteredCards.map(c => c.bank))).sort()
    return { level3Cards: feeFilteredCards, availableBrands }
  }

  static twoTierRecommendationSystem(level3Cards: CreditCard[], userProfile: UserProfile): TwoTierResult {
    if (level3Cards.length === 0) {
      return { preferredBrandCards: [], generalCards: [], showGeneralMessage: false, finalTop7: [] }
    }

    let preferredBrandCards: ScoredCard[] = []
    let generalCards: ScoredCard[] = []
    let showGeneralMessage = false

    if (userProfile.preferredBrands.length > 0) {
      const brandMatched = level3Cards.filter(c => userProfile.preferredBrands.includes(c.bank))
      if (brandMatched.length > 0) {
        preferredBrandCards = this.scoreAndSortCards(brandMatched, userProfile, 'preferred_brand').slice(0, 3)
      }
      if (preferredBrandCards.length < 3) {
        const remainingSlots = 3 - preferredBrandCards.length
        const generalCandidates = level3Cards.filter(
          c => !preferredBrandCards.some(p => p.card.id === c.id),
        )
        if (generalCandidates.length > 0) {
          generalCards = this.scoreAndSortCards(generalCandidates, userProfile, 'general').slice(0, remainingSlots)
          showGeneralMessage = true
        }
      }
    } else {
      generalCards = this.scoreAndSortCards(level3Cards, userProfile, 'general').slice(0, 3)
    }

    const finalTop7 = [...preferredBrandCards, ...generalCards].slice(0, 3)
    return { preferredBrandCards, generalCards, showGeneralMessage, finalTop7 }
  }

  private static scoreAndSortCards(
    cards: CreditCard[],
    userProfile: UserProfile,
    tier: 'preferred_brand' | 'general',
  ): ScoredCard[] {
    const BRAND_BOOST = 1.05

    const scored = cards.map(card => {
      const envsResult = calcENVS(userProfile, card)

      // Primary score = ENVS (Year2+ now, more conservative)
      // Secondary tiebreaker: 2% max boost from spend alignment
      const alignmentBoost = 1 + (envsResult.spendAlignmentScore / 100) * 0.02
      let score = envsResult.envs * alignmentBoost
      if (userProfile.preferredBrands.includes(card.bank)) score *= BRAND_BOOST

      return {
        card,
        score,
        envsResult,
        scoreBreakdown: {
          totalRewards:        envsResult.totalAnnualRewards,
          annualFee:           envsResult.annualFeeEffective,
          joiningFeeAmortized: envsResult.joiningFeeAmortized,
          effectiveFee:        envsResult.effectiveAnnualFee,
          milestoneBonus:      envsResult.milestoneBonus,
          signUpAmortized:     envsResult.signUpBonusAmortized,
        },
        matchPercentage: envsResult.matchPercentage,
        reasoning: generateENVSReasoning(card, envsResult, userProfile),
        tier,
      }
    })

    return scored.sort((a, b) => b.score - a.score)
  }

  static processFunnel(allCards: CreditCard[], userProfile: UserProfile): FunnelResult {
    const level1Cards = this.level1BasicEligibility(
      allCards,
      userProfile.monthlyIncome,
      userProfile.creditScore,
      userProfile.employmentType,
    )
    const level2Cards = this.level2CategoryFiltering(level1Cards, userProfile.spendingCategories)
    const { level3Cards, availableBrands } = this.level3JoiningFeeAndBrandFiltering(
      level2Cards,
      userProfile.joiningFeePreference,
    )
    const twoTierResult = this.twoTierRecommendationSystem(level3Cards, userProfile)

    return {
      level1Cards,
      level2Cards,
      level3Cards,
      availableBrands,
      finalRecommendations: twoTierResult.finalTop7,
      funnelStats: {
        totalCards: allCards.length,
        level1Count: level1Cards.length,
        level2Count: level2Cards.length,
        level3Count: level3Cards.length,
        finalCount: twoTierResult.finalTop7.length,
      },
      twoTierResult,
    }
  }
}

// ── v3: Portfolio Optimizer ───────────────────────────────────────────────────

/**
 * Multi-card portfolio optimizer.
 * Given the user's existing cards, find the best card to add that maximises incremental ENVS.
 *
 * Logic:
 *  1. For each category, compute the best rate the user already gets across existing cards.
 *  2. Compute "covered ENVS" — what the user already earns with best-card routing.
 *  3. For each candidate: incremental ENVS = total portfolio ENVS with this card added - covered ENVS.
 *  4. Return top 3 by incremental value.
 */
export function calcPortfolioComplement(
  existingCards: CreditCard[],
  candidateCards: CreditCard[],
  user: UserProfile,
): PortfolioResult {
  if (existingCards.length === 0) {
    // No existing cards — just return top recommendations
    const engine = FunnelRecommendationEngine
    const allScored = engine['scoreAndSortCards' as keyof typeof engine]
    // Fall back to top candidates by ENVS
    const topCandidates = candidateCards
      .map(c => ({ card: c, score: calcENVS(user, c).envs, envsResult: calcENVS(user, c), scoreBreakdown: { totalRewards: 0, annualFee: 0, joiningFeeAmortized: 0, effectiveFee: 0, milestoneBonus: 0, signUpAmortized: 0 }, matchPercentage: 0, reasoning: '', incrementalValue: calcENVS(user, c).envs }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
    return { existingCards, topComplements: topCandidates, coveredEnvs: 0, gapCategories: Object.keys(user.spendDistribution) }
  }

  // Step 1: for each category, find the best effective rate across existing cards
  const bestExistingRatePerCat: Record<string, number> = {}
  for (const category of Object.keys(user.spendDistribution)) {
    let bestReward = 0
    for (const card of existingCards) {
      const confidence = user.spendConfidence?.[category]
      const reward = calcCategoryReward(user.spendDistribution[category], card, category, confidence)
      if (reward > bestReward) bestReward = reward
    }
    bestExistingRatePerCat[category] = bestReward
  }

  // Step 2: covered ENVS — best-card routing with existing cards
  // We also include non-reward benefits (lounge, fuel, forex) for the best existing card per those dimensions
  const coveredMonthlyRewards = Object.values(bestExistingRatePerCat).reduce((a, b) => a + b, 0)
  const coveredEnvs = coveredMonthlyRewards * 12

  // Step 3: gap categories = where existing cards earn base rate or less
  const gapCategories: string[] = []
  for (const [category, spend] of Object.entries(user.spendDistribution)) {
    if (spend === 0) continue
    // Best existing reward / spend — is it meaningfully above base?
    const baseRewardBestCard = existingCards.reduce((best, card) => {
      const baseOnly = spend * (card.baseRewardRate / 100) * (card.pointValue > 0 ? card.pointValue : (REWARD_VALUE[card.rewardType] ?? 0.25))
      return Math.max(best, baseOnly)
    }, 0)
    const actualBest = bestExistingRatePerCat[category]
    if (actualBest <= baseRewardBestCard * 1.05) {
      gapCategories.push(category)
    }
  }

  // Step 4: for each candidate, compute incremental ENVS
  const scored: ScoredCard[] = candidateCards.map(card => {
    const envsResult = calcENVS(user, card)

    // Incremental rewards: for each category, take the MAX of (new card reward, best existing reward)
    let incrementalMonthly = 0
    for (const [category, spend] of Object.entries(user.spendDistribution)) {
      const confidence = user.spendConfidence?.[category]
      const newCardReward = calcCategoryReward(spend, card, category, confidence)
      const existingBest = bestExistingRatePerCat[category] ?? 0
      const gain = newCardReward - existingBest
      if (gain > 0) incrementalMonthly += gain
    }

    // Add non-reward ENVS components from the new card (lounge, fuel, forex)
    const loungeGain = envsResult.loungeAnnualValue
    const fuelGain = envsResult.fuelSurchargeAnnualSavings
    const forexLoss = envsResult.forexAnnualCost

    const incrementalValue = (incrementalMonthly * 12) + loungeGain + fuelGain - forexLoss - envsResult.annualFeeEffective - envsResult.joiningFeeAmortized

    return {
      card,
      score: incrementalValue,
      envsResult,
      scoreBreakdown: {
        totalRewards: envsResult.totalAnnualRewards,
        annualFee: envsResult.annualFeeEffective,
        joiningFeeAmortized: envsResult.joiningFeeAmortized,
        effectiveFee: envsResult.effectiveAnnualFee,
        milestoneBonus: envsResult.milestoneBonus,
        signUpAmortized: envsResult.signUpBonusAmortized,
      },
      matchPercentage: envsResult.matchPercentage,
      reasoning: generateENVSReasoning(card, envsResult, user),
      tier: 'general',
      incrementalValue,
    }
  })

  const topComplements = scored
    .filter(s => (s.incrementalValue ?? 0) > 0)
    .sort((a, b) => (b.incrementalValue ?? 0) - (a.incrementalValue ?? 0))
    .slice(0, 3)

  return { existingCards, topComplements, coveredEnvs, gapCategories }
}
