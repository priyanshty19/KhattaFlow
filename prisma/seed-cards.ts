/**
 * Seed credit card catalog from prisma/data/credit-cards.xlsx into Supabase.
 * Usage: npm run db:seed-cards
 */
import path from 'path'
import * as XLSX from 'xlsx'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ── Category key normalisation ────────────────────────────────────────────────
// Transforms Excel category names → engine category keys (ALL_REWARD_CATEGORIES)

const EXCEL_TO_ENGINE: Record<string, string | null> = {
  'Dining & Restaurants': 'Dining',
  'Travel & Hotels':      'Travel',
  'Fuel & Gas':           'Fuel',
  'Utilities & Bills':    'Utilities',
  'Online Shopping':      'Online Shopping',
  'Groceries':            'Groceries',
  'Entertainment':        'Entertainment',
  'International Spends': 'International Spends',
  'Transport':            'Fuel',         // Uber/Ola/fuel → Fuel
  'Offline Spends':       null,           // catch-all, not meaningful
  'Business & Professional': null,
}

function normaliseCategoryRates(raw: unknown): Record<string, number> {
  if (!raw) return {}
  try {
    const src: Record<string, number> = typeof raw === 'string' ? JSON.parse(raw) : (raw as Record<string, number>)
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(src)) {
      const mapped = EXCEL_TO_ENGINE[k]
      if (mapped) out[mapped] = Math.max(out[mapped] ?? 0, Number(v))
    }
    return out
  } catch { return {} }
}

function normaliseCategoryCaps(raw: unknown): Record<string, number> {
  if (!raw) return {}
  try {
    const src: Record<string, number> = typeof raw === 'string' ? JSON.parse(raw) : (raw as Record<string, number>)
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(src)) {
      const mapped = EXCEL_TO_ENGINE[k]
      if (mapped) out[mapped] = Math.max(out[mapped] ?? 0, Number(v))
    }
    return out
  } catch { return {} }
}

// ── Post-read overrides ───────────────────────────────────────────────────────
// Applied AFTER Excel parsing. Use when the Excel value is wrong and we can't
// (or don't want to) edit the binary file.
//
// HDFC-068/076/077: These cards issue CashPoints redeemable at ₹1 each.
// The Excel encodes their category rates as direct cashback % (e.g. "5%" = 5%
// back, not 5 points × ₹0.25 = 1.25%). pointValue must be 1.0, not 0.25.
const CARD_OVERRIDES: Record<string, Partial<{
  pointValue: number
  rewardType: string
  baseRewardRate: number
  milestoneBonus: number
  minAnnualSpend: number
  // v3 fields
  platformCoverage: number
  platformNote: string
  loungeValuePerVisit: number
  networkType: string
}>> = {
  // ── HDFC CashPoints cards ────────────────────────────────────────────────────
  // Excel stores pv=0.25 (standard HDFC points) but these cards issue CashPoints
  // redeemable at ₹1 each; rates already expressed as direct cashback %.
  'HDFC-068': { pointValue: 1.0 },  // Millennia
  'HDFC-076': { pointValue: 1.0 },  // MoneyBack+
  'HDFC-077': { pointValue: 1.0 },  // Pixel Play

  // ── American Express Membership Rewards cards ────────────────────────────────
  // Excel uses pv=0.25 (lowest statement-credit floor). Realistic value when
  // transferred to Marriott Bonvoy / airline partners is ₹0.50/pt (conservative).
  // SmartEarn: issues direct cashback credits → pv=1.0.
  // Platinum Travel: milestone at ₹4L/year = Taj + IndiGo vouchers ≈ ₹10,000.
  'AMEX-001': { pointValue: 0.50, loungeValuePerVisit: 1200, networkType: 'Amex' },  // Platinum Card
  'AMEX-002': { pointValue: 0.50, networkType: 'Amex' },  // Membership Rewards
  'AMEX-003': { pointValue: 1.0, networkType: 'Amex'  },  // SmartEarn — direct cashback
  'AMEX-004': { pointValue: 0.50, loungeValuePerVisit: 1200, networkType: 'Amex' },  // Platinum Reserve
  'AMEX-005': { pointValue: 0.50, networkType: 'Amex' },  // Gold Card
  'AMEX-006': { pointValue: 0.50, milestoneBonus: 10000, minAnnualSpend: 400000, networkType: 'Amex' },  // Platinum Travel

  // ── v3: Merchant-specific rate corrections ───────────────────────────────────
  // These cards earn their bonus category rate ONLY on specific merchant/portal spend.
  // platformCoverage = realistic fraction of category spend via that platform.
  // Without this fix, ENVS is massively inflated and these cards dominate every profile.
  'FED-064':   { platformCoverage: 0.25, platformNote: 'Only via Scapia portal' },         // Federal Bank Scapia
  'HDFC-073':  { platformCoverage: 0.30, platformNote: 'Only on Swiggy orders' },          // Swiggy HDFC
  'ICICI-088': { platformCoverage: 0.40, platformNote: 'Only on Amazon.in' },              // Amazon Pay ICICI
  'AXIS-024':  { platformCoverage: 0.35, platformNote: 'Only on Flipkart & Myntra' },      // Flipkart Axis Bank

  // ── v3: Premium lounge cards — international visits worth more ───────────────
  'HDFC-066':  { loungeValuePerVisit: 1000 },  // HDFC Infinia — intl+domestic unlimited
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const num  = (v: unknown, def = 0)  => { if (v == null || v === '') return def; const n = parseFloat(v.toString().replace(/,/g, '')); return isNaN(n) ? def : n }
const int  = (v: unknown, def = 0)  => { if (v == null || v === '') return def; const n = parseInt(v.toString().replace(/,/g, ''), 10); return isNaN(n) ? def : n }
const str  = (v: unknown, def = '') => (v == null || v === '') ? def : v.toString().trim()
const list = (v: unknown) => str(v).split(',').map(s => s.trim()).filter(Boolean)

function parseLounge(v: unknown): string {
  const s = str(v, 'none').toLowerCase()
  if (s === 'unlimited') return 'unlimited'
  if (s.includes('international') || s === 'domestic+international') return 'domestic+international'
  if (s.includes('domestic')) return 'domestic'
  return 'none'
}

function parseRewardType(v: unknown): string {
  const s = str(v, 'points').toLowerCase()
  if (s === 'cashback') return 'cashback'
  if (s === 'miles')    return 'miles'
  if (s === 'hybrid')   return 'hybrid'
  return 'points'
}

function parseMilestones(v: unknown): object[] {
  if (!v || v === '') return []
  try {
    const parsed = typeof v === 'string' ? JSON.parse(v) : v
    if (Array.isArray(parsed)) return parsed
    return []
  } catch { return [] }
}

function parseNetworkType(v: unknown): string {
  const s = str(v, '').toLowerCase().trim()
  if (s === 'mastercard' || s === 'mc') return 'Mastercard'
  if (s === 'rupay') return 'RuPay'
  if (s === 'amex' || s === 'american express') return 'Amex'
  if (s === 'diners') return 'Diners'
  if (s === 'visa') return 'Visa'
  return 'Visa'  // default
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const xlsxPath = path.resolve(__dirname, 'data/credit-cards.xlsx')
  console.log(`Reading: ${xlsxPath}`)

  const workbook = XLSX.readFile(xlsxPath)
  const ws = workbook.Sheets['Card-Data']
  if (!ws) throw new Error('Sheet "Card-Data" not found in Excel file')

  // Row 0 = group label headers, Row 1 = column headers, Row 2+ = data
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null }) as unknown[][]
  const headers = (raw[1] as string[]).map(h => h?.toString().trim() ?? '')
  const dataRows = raw.slice(2)

  console.log(`Headers: ${headers.length} columns | Data rows: ${dataRows.length}`)

  // Build column index lookup
  const col = (name: string) => headers.indexOf(name)
  const C = {
    id:               col('id'),
    cardName:         col('Card Name'),
    bank:             col('Bank'),
    cardType:         col('Card Type'),
    creditScore:      col('Min Credit Score'),
    monthlyIncome:    col('Min Monthly Income (₹)'),
    joiningFee:       col('Joining Fee (₹)'),
    annualFee:        col('Annual Fee (₹)'),
    feeWaiver:        col('Fee Waiver Threshold (₹)'),
    rewardType:       col('Reward Type'),
    pointValue:       col('Point Value (₹)'),
    baseRewardRate:   col('Base Reward Rate (%)'),
    categoryRates:    col('Category Reward Rates'),
    categoryCaps:     col('Category Caps (₹/mo)'),
    signUpBonus:      col('Sign Up Bonus (₹)'),
    signUpSpend:      col('Sign Up Spend Required (₹)'),
    signUpWindow:     col('Sign Up Window (days)'),
    milestoneDep:     col('Milestone Dependency'),
    minAnnualSpend:   col('Min Annual Spend (₹)'),
    milestoneBonus:   col('Milestone Bonus (₹)'),
    milestoneDesc:    col('Milestone Benefit Desc'),
    loungeAccess:     col('Lounge Access'),
    loungeVisits:     col('Lounge Visits/Year'),
    forexMarkup:      col('Forex Markup (%)'),
    fuelWaiver:       col('Fuel Surcharge Waiver'),
    bestForTags:          col('Best For (Tags)'),
    features:             col('Features'),
    categories:           col('Spending Categories'),
    // v3 columns (optional — default values used if column absent)
    platformCoverage:     col('Platform Coverage (0-1)'),
    platformNote:         col('Platform Note'),
    loungeValuePerVisit:  col('Lounge Value/Visit (₹)'),
    milestones:           col('Milestones (JSON)'),
    networkType:          col('Network Type'),
    employmentReq:        col('Employment Requirement'),
    applyUrl:             col('Apply URL'),
    imageUrl:             col('Image URL'),
  }

  const missing = Object.entries(C).filter(([, v]) => v === -1).map(([k]) => k)
  if (missing.length) console.warn('⚠ Columns not found (check header names):', missing.join(', '))

  let inserted = 0, updated = 0, skipped = 0

  for (const row of dataRows) {
    const r = row as unknown[]
    const cardId   = str(r[C.id])
    const cardName = str(r[C.cardName])
    const bank     = str(r[C.bank])
    if (!cardId || !cardName || !bank) { skipped++; continue }

    const data = {
      cardName,
      bank,
      cardType:                 str(r[C.cardType], 'Rewards'),
      creditScoreRequirement:   int(r[C.creditScore]),
      monthlyIncomeRequirement: int(r[C.monthlyIncome]),
      joiningFee:               int(r[C.joiningFee]),
      annualFee:                int(r[C.annualFee]),
      feeWaiverThreshold:       int(r[C.feeWaiver]),
      rewardType:               parseRewardType(r[C.rewardType]),
      pointValue:               num(r[C.pointValue], 0.25),
      baseRewardRate:           num(r[C.baseRewardRate]),
      categoryRewardRates:      normaliseCategoryRates(r[C.categoryRates]),
      categoryCaps:             normaliseCategoryCaps(r[C.categoryCaps]),
      signUpBonus:              int(r[C.signUpBonus]),
      signUpSpendRequired:      int(r[C.signUpSpend]),
      signUpWindowDays:         int(r[C.signUpWindow]),
      milestoneDependency:      num(r[C.milestoneDep]) > 0,
      minAnnualSpend:           int(r[C.minAnnualSpend]),
      milestoneBonus:           int(r[C.milestoneBonus]),
      milestoneBenefitDesc:     str(r[C.milestoneDesc]) || null,
      loungeAccess:             parseLounge(r[C.loungeAccess]),
      loungeVisitsPerYear:      int(r[C.loungeVisits]),
      forexMarkup:              num(r[C.forexMarkup], 3.5),
      fuelSurchargeWaiver:      num(r[C.fuelWaiver]) === 1,
      bestForTags:              list(r[C.bestForTags]),
      features:                 str(r[C.features]) || null,
      spendingCategories:       list(r[C.categories]),
      isActive:                 true,
      // v3 fields
      platformCoverage:         C.platformCoverage !== -1 ? num(r[C.platformCoverage], 1.0) : 1.0,
      platformNote:             C.platformNote !== -1 ? str(r[C.platformNote]) || null : null,
      loungeValuePerVisit:      C.loungeValuePerVisit !== -1 ? int(r[C.loungeValuePerVisit], 700) : 700,
      milestones:               C.milestones !== -1 ? parseMilestones(r[C.milestones]) : [],
      networkType:              C.networkType !== -1 ? parseNetworkType(r[C.networkType]) : 'Visa',
      employmentRequirement:    C.employmentReq !== -1 ? str(r[C.employmentReq], 'any') || 'any' : 'any',
      applyUrl:                 C.applyUrl !== -1 ? str(r[C.applyUrl]) || null : null,
      imageUrl:                 C.imageUrl !== -1 ? str(r[C.imageUrl]) || null : null,
    }

    // Apply any hard-coded overrides for cards whose Excel values are wrong
    const overrides = CARD_OVERRIDES[cardId] ?? {}
    const finalData = { ...data, ...overrides }

    try {
      const existing = await prisma.creditCard.findUnique({ where: { id: cardId } })
      if (existing) {
        await prisma.creditCard.update({ where: { id: cardId }, data: finalData })
        process.stdout.write('.')
        updated++
      } else {
        await prisma.creditCard.create({ data: { id: cardId, ...finalData } })
        process.stdout.write('+')
        inserted++
      }
    } catch (err) {
      console.error(`\nFailed ${cardId}: ${err instanceof Error ? err.message : err}`)
      skipped++
    }
  }

  console.log(`\n\n✅ Done: ${inserted} inserted, ${updated} updated, ${skipped} skipped`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
