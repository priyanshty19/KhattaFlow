export type CategoryType = 'income' | 'expense' | 'investment' | 'savings'

export interface CategoryTemplate {
  name: string
  slug: string
  type: CategoryType
  color: string
  isFixed: boolean
  isSystem: boolean
  sortOrder: number
  group: string | null
}

export type InvestmentStyle = 'conservative' | 'balanced' | 'aggressive'
export type ProfileType = 'salaried' | 'freelancer' | 'student' | 'business'

export interface FixedCommitment {
  id: string
  label: string
  slug: string
  color: string
  group: string
}

export const FIXED_COMMITMENT_OPTIONS: FixedCommitment[] = [
  { id: 'rent',      label: 'Rent / Housing',     slug: 'rent',          color: '#EF4444', group: 'Fixed EMIs' },
  { id: 'home-loan', label: 'Home Loan EMI',       slug: 'home-loan-emi', color: '#EF4444', group: 'Fixed EMIs' },
  { id: 'car-loan',  label: 'Car / Vehicle Loan',  slug: 'car-loan-emi',  color: '#F59E0B', group: 'Fixed EMIs' },
  { id: 'edu-loan',  label: 'Education Loan',      slug: 'edu-loan-emi',  color: '#F59E0B', group: 'Fixed EMIs' },
]

const INVESTMENT_CATEGORIES: Record<InvestmentStyle, CategoryTemplate[]> = {
  conservative: [
    { name: 'Fixed Deposit',       slug: 'fixed-deposit',  type: 'investment', color: '#10B981', isFixed: false, isSystem: false, sortOrder: 30, group: 'Safe' },
    { name: 'PPF',                 slug: 'ppf',            type: 'investment', color: '#10B981', isFixed: false, isSystem: true,  sortOrder: 31, group: 'Safe' },
    { name: 'Recurring Deposit',   slug: 'rd',             type: 'investment', color: '#34D399', isFixed: false, isSystem: false, sortOrder: 32, group: 'Safe' },
    { name: 'Government Bonds',    slug: 'govt-bonds',     type: 'investment', color: '#34D399', isFixed: false, isSystem: false, sortOrder: 33, group: 'Safe' },
  ],
  balanced: [
    { name: 'Mutual Funds',        slug: 'mutual-funds',   type: 'investment', color: '#0EA5E9', isFixed: false, isSystem: true,  sortOrder: 30, group: 'Market' },
    { name: 'PPF',                 slug: 'ppf',            type: 'investment', color: '#10B981', isFixed: false, isSystem: true,  sortOrder: 31, group: 'Safe' },
    { name: 'Emergency Fund',      slug: 'emergency-fund', type: 'savings',    color: '#10B981', isFixed: false, isSystem: true,  sortOrder: 40, group: 'Savings' },
    { name: 'Goal Savings',        slug: 'goal-savings',   type: 'savings',    color: '#34D399', isFixed: false, isSystem: false, sortOrder: 41, group: 'Savings' },
  ],
  aggressive: [
    { name: 'Mutual Funds',        slug: 'mutual-funds',   type: 'investment', color: '#0EA5E9', isFixed: false, isSystem: true,  sortOrder: 30, group: 'Market' },
    { name: 'Indian Stocks',       slug: 'indian-stocks',  type: 'investment', color: '#0EA5E9', isFixed: false, isSystem: false, sortOrder: 31, group: 'Market' },
    { name: 'US Stocks',           slug: 'us-stocks',      type: 'investment', color: '#3B82F6', isFixed: false, isSystem: false, sortOrder: 32, group: 'Market' },
    { name: 'Crypto',              slug: 'crypto',         type: 'investment', color: '#F59E0B', isFixed: false, isSystem: false, sortOrder: 33, group: 'Market' },
    { name: 'Emergency Fund',      slug: 'emergency-fund', type: 'savings',    color: '#10B981', isFixed: false, isSystem: true,  sortOrder: 40, group: 'Savings' },
  ],
}

export function buildDefaultCategories(
  profile: ProfileType,
  incomeName: string,
  commitments: string[],   // ids from FIXED_COMMITMENT_OPTIONS
  investmentStyle: InvestmentStyle,
  customCommitments: string[] = [], // free-text "Other" commitments the user typed
): CategoryTemplate[] {
  // Counter guarantees every slug is unique within a single build — important
  // because custom "Other" commitments can collide with a preset base name
  // (e.g. "Shopping"), and Category has a @@unique([userId, slug]) constraint.
  let slugN = 0
  const slug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + `-${Date.now()}-${slugN++}`

  const incomeLabel = profile === 'freelancer' ? 'Freelance Income'
    : profile === 'student' ? 'Stipend / Pocket Money'
    : profile === 'business' ? 'Business Revenue'
    : incomeName || 'Salary'

  const categories: CategoryTemplate[] = [
    // ── Income ───────────────────────────────────────────────────────
    { name: incomeLabel,     slug: slug(incomeLabel), type: 'income', color: '#10B981', isFixed: true,  isSystem: true,  sortOrder: 1,  group: null },
    { name: 'Other Income',  slug: slug('other-income'), type: 'income', color: '#34D399', isFixed: false, isSystem: true,  sortOrder: 2,  group: null },

    // ── Fixed commitments (user-selected) ────────────────────────────
    ...FIXED_COMMITMENT_OPTIONS
      .filter(c => commitments.includes(c.id))
      .map((c, i) => ({
        name: c.label,
        slug: slug(c.label),
        type: 'expense' as CategoryType,
        color: c.color,
        isFixed: true,
        isSystem: false,
        sortOrder: 10 + i,
        group: c.group,
      })),

    // ── Custom "Other" commitments (free-text) ───────────────────────
    // De-duped (case-insensitive) and skipping anything that matches a preset
    // so we never create two identical Fixed EMIs categories.
    ...Array.from(
      new Map(
        customCommitments
          .map(s => s.trim().replace(/\s+/g, ' '))
          .filter(Boolean)
          .filter(name => !FIXED_COMMITMENT_OPTIONS.some(o => o.label.toLowerCase() === name.toLowerCase()))
          .map(name => [name.toLowerCase(), name] as const),
      ).values(),
    ).map((name, i) => ({
      name,
      slug: slug(name),
      type: 'expense' as CategoryType,
      color: '#F59E0B',
      isFixed: true,
      isSystem: false,
      sortOrder: 14, // after presets (10–13), before Subscriptions (15); ties order by name
      group: 'Fixed EMIs',
    })),

    // ── Subscriptions / Fixed Bills ──────────────────────────────────
    { name: 'Subscriptions', slug: slug('subscriptions'), type: 'expense', color: '#8B5CF6', isFixed: true,  isSystem: false, sortOrder: 15, group: 'Fixed Bills' },

    // ── Variable Expenses ────────────────────────────────────────────
    { name: 'Food & Dining', slug: slug('food-dining'),   type: 'expense', color: '#F97316', isFixed: false, isSystem: true,  sortOrder: 20, group: 'Daily Living' },
    { name: 'Transport',     slug: slug('transport'),     type: 'expense', color: '#6366F1', isFixed: false, isSystem: true,  sortOrder: 21, group: 'Daily Living' },
    { name: 'Utilities',     slug: slug('utilities'),     type: 'expense', color: '#F59E0B', isFixed: false, isSystem: false, sortOrder: 22, group: 'Daily Living' },
    { name: 'Shopping',      slug: slug('shopping'),      type: 'expense', color: '#06B6D4', isFixed: false, isSystem: false, sortOrder: 23, group: 'Lifestyle' },
    { name: 'Entertainment', slug: slug('entertainment'), type: 'expense', color: '#EC4899', isFixed: false, isSystem: false, sortOrder: 24, group: 'Lifestyle' },
    { name: 'Healthcare',    slug: slug('healthcare'),    type: 'expense', color: '#EF4444', isFixed: false, isSystem: false, sortOrder: 25, group: 'Lifestyle' },
    { name: 'Miscellaneous', slug: slug('misc'),          type: 'expense', color: '#94A3B8', isFixed: false, isSystem: true,  sortOrder: 26, group: 'Lifestyle' },

    // ── Profile-specific extras ──────────────────────────────────────
    ...(profile === 'freelancer' ? [
      { name: 'Business Expenses', slug: slug('biz-expenses'), type: 'expense' as CategoryType, color: '#F59E0B', isFixed: false, isSystem: false, sortOrder: 27, group: 'Business' },
    ] : []),
    ...(profile === 'student' ? [
      { name: 'Tuition / Fees', slug: slug('tuition'), type: 'expense' as CategoryType, color: '#EF4444', isFixed: true, isSystem: false, sortOrder: 27, group: 'Education' },
      { name: 'Books & Supplies', slug: slug('books'), type: 'expense' as CategoryType, color: '#F59E0B', isFixed: false, isSystem: false, sortOrder: 28, group: 'Education' },
    ] : []),
    ...(profile === 'business' ? [
      { name: 'Business Expenses', slug: slug('biz-expenses'), type: 'expense' as CategoryType, color: '#F59E0B', isFixed: false, isSystem: false, sortOrder: 27, group: 'Business' },
      { name: 'Tax / GST',         slug: slug('tax-gst'),      type: 'expense' as CategoryType, color: '#EF4444', isFixed: false, isSystem: false, sortOrder: 28, group: 'Business' },
    ] : []),

    // ── Investments & Savings (style-based) ──────────────────────────
    ...INVESTMENT_CATEGORIES[investmentStyle],
  ]

  // Always ensure Emergency Fund for conservative (already included above for balanced/aggressive)
  const hasEmergency = categories.some(c => c.slug.startsWith('emergency-fund'))
  if (!hasEmergency) {
    categories.push({ name: 'Emergency Fund', slug: slug('emergency-fund'), type: 'savings', color: '#10B981', isFixed: false, isSystem: true, sortOrder: 40, group: 'Savings' })
  }

  return categories
}

// Fallback for users who bypass onboarding (GET /api/categories auto-seed)
export const DEFAULT_CATEGORIES: CategoryTemplate[] = [
  { name: 'Salary',        slug: 'salary',        type: 'income',     color: '#10B981', isFixed: true,  isSystem: true,  sortOrder: 1,  group: null },
  { name: 'Other Income',  slug: 'other-income',  type: 'income',     color: '#34D399', isFixed: false, isSystem: true,  sortOrder: 2,  group: null },
  { name: 'Subscriptions', slug: 'subscriptions', type: 'expense',    color: '#8B5CF6', isFixed: true,  isSystem: false, sortOrder: 15, group: 'Fixed Bills' },
  { name: 'Food & Dining', slug: 'food-dining',   type: 'expense',    color: '#F97316', isFixed: false, isSystem: true,  sortOrder: 20, group: 'Daily Living' },
  { name: 'Transport',     slug: 'transport',     type: 'expense',    color: '#6366F1', isFixed: false, isSystem: true,  sortOrder: 21, group: 'Daily Living' },
  { name: 'Utilities',     slug: 'utilities',     type: 'expense',    color: '#F59E0B', isFixed: false, isSystem: false, sortOrder: 22, group: 'Daily Living' },
  { name: 'Shopping',      slug: 'shopping',      type: 'expense',    color: '#06B6D4', isFixed: false, isSystem: false, sortOrder: 23, group: 'Lifestyle' },
  { name: 'Entertainment', slug: 'entertainment', type: 'expense',    color: '#EC4899', isFixed: false, isSystem: false, sortOrder: 24, group: 'Lifestyle' },
  { name: 'Healthcare',    slug: 'healthcare',    type: 'expense',    color: '#EF4444', isFixed: false, isSystem: false, sortOrder: 25, group: 'Lifestyle' },
  { name: 'Miscellaneous', slug: 'misc',          type: 'expense',    color: '#94A3B8', isFixed: false, isSystem: true,  sortOrder: 26, group: 'Lifestyle' },
  { name: 'Mutual Funds',  slug: 'mutual-funds',  type: 'investment', color: '#0EA5E9', isFixed: false, isSystem: true,  sortOrder: 30, group: 'Market' },
  { name: 'Emergency Fund',slug: 'emergency-fund',type: 'savings',    color: '#10B981', isFixed: false, isSystem: true,  sortOrder: 40, group: 'Savings' },
  { name: 'Goal Savings',  slug: 'goal-savings',  type: 'savings',    color: '#34D399', isFixed: false, isSystem: false, sortOrder: 41, group: 'Savings' },
]

export const CATEGORY_TYPE_LABELS: Record<string, string> = {
  income: 'Income',
  expense: 'Expense',
  investment: 'Investment',
  savings: 'Savings',
}

export const CATEGORY_TYPE_COLORS: Record<string, string> = {
  income:     '#10B981',
  expense:    '#EF4444',
  investment: '#0EA5E9',
  savings:    '#8B5CF6',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash:          'Cash',
  credit_card:   'Credit Card',
  upi:           'UPI',
  bank_transfer: 'Bank Transfer',
  auto_debit:    'Auto Debit',
}
