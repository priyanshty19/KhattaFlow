import { FinancialEmailType, FinancialCategoryHint } from '@/lib/engines/financial-email-parser'

export interface AutoAssignCategory {
  id: string
  name: string
  type: string
  slug: string
}

export interface AutoAssignItem {
  gmailMessageId: string
  type: FinancialEmailType
  categoryHint: FinancialCategoryHint
  suggestedCategorySlug?: string | null
}

// Which category type each suggested slug implies
const SLUG_TO_TYPE: Record<string, 'income' | 'expense' | 'investment' | 'savings'> = {
  investments: 'investment',
  salary: 'income',
  dividends: 'income',
  'interest-income': 'income',
  'other-income': 'income',
  savings: 'savings',
  'loan-emi': 'expense',
  insurance: 'expense',
  'credit-card-payment': 'expense',
}

function byType(cats: AutoAssignCategory[], t: string): AutoAssignCategory | undefined {
  return cats.find(c => c.type === t)
}

function utilitiesCat(cats: AutoAssignCategory[]): AutoAssignCategory | undefined {
  return (
    cats.find(c => c.slug === 'utilities') ??
    cats.find(c => c.name.toLowerCase().includes('utilit')) ??
    byType(cats, 'expense')
  )
}

function findInvestmentCat(
  cats: AutoAssignCategory[],
  emailType: FinancialEmailType
): AutoAssignCategory | undefined {
  switch (emailType) {
    case 'mf_purchase':
    case 'mf_sip':
    case 'mf_redemption':
      return (
        cats.find(c => c.type === 'investment' && /mutual\s*fund|sip\b|\bmf\b/i.test(c.name)) ??
        cats.find(c => c.type === 'investment' && /invest/i.test(c.name)) ??
        byType(cats, 'investment')
      )
    case 'stock_trade':
      return (
        cats.find(c => c.type === 'investment' && /stock|equit|share|nifty|demat/i.test(c.name)) ??
        cats.find(c => c.type === 'investment' && /invest/i.test(c.name)) ??
        byType(cats, 'investment')
      )
    default:
      return byType(cats, 'investment')
  }
}

/**
 * Auto-assign a single email item to the best matching category.
 * Returns the category ID, or null if no match (e.g. cc_statement).
 */
export function autoAssignOne(
  item: AutoAssignItem,
  cats: AutoAssignCategory[]
): string | null {
  if (item.type === 'cc_statement') return null

  // 1. Exact slug match against user's categories
  if (item.suggestedCategorySlug) {
    const bySlug = cats.find(c => c.slug === item.suggestedCategorySlug)
    if (bySlug) return bySlug.id

    // 2. Slug implies a category type
    const impliedType = SLUG_TO_TYPE[item.suggestedCategorySlug]
    if (impliedType) {
      const byImplied =
        impliedType === 'investment'
          ? findInvestmentCat(cats, item.type)
          : byType(cats, impliedType)
      if (byImplied) return byImplied.id
    }
  }

  // 3. Type-aware fallback — no cross-type fallback to avoid mismatches
  let cat: AutoAssignCategory | undefined
  switch (item.type) {
    case 'mf_purchase':
    case 'mf_sip':
    case 'mf_redemption':
    case 'stock_trade':
    case 'dividend':
      cat = findInvestmentCat(cats, item.type)
      break
    case 'salary_credit':
    case 'bank_credit':
    case 'fd_interest':
    case 'fd_maturity':
      cat = byType(cats, 'income')
      break
    case 'bank_debit':
    case 'upi_transaction':
      cat = utilitiesCat(cats)
      break
    default:
      cat = byType(cats, 'expense')
  }
  return cat?.id ?? null
}

/**
 * Auto-assign all items in a batch.
 * Returns Record<gmailMessageId, categoryId> — items without a match are omitted.
 */
export function autoAssignAll(
  items: AutoAssignItem[],
  cats: AutoAssignCategory[]
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const item of items) {
    const catId = autoAssignOne(item, cats)
    if (catId) result[item.gmailMessageId] = catId
  }
  return result
}
