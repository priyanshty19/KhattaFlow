// prisma/seed.ts
import { PrismaClient, CategoryType } from '@prisma/client'

const prisma = new PrismaClient()

export const DEFAULT_CATEGORIES = [
  // ── INCOME ──────────────────────────────────────────────────────────
  { name: 'Salary',          slug: 'salary',          type: 'income',     color: '#10B981', icon: 'briefcase',    isFixed: true,  isSystem: true,  sortOrder: 1 },
  { name: 'Rent Received',   slug: 'rent-received',   type: 'income',     color: '#10B981', icon: 'home',         isFixed: false, isSystem: true,  sortOrder: 2 },
  { name: 'Papa Airtel',     slug: 'papa-airtel',     type: 'income',     color: '#10B981', icon: 'wifi',         isFixed: false, isSystem: false, sortOrder: 3 },
  { name: 'Transfers In',    slug: 'transfers-in',    type: 'income',     color: '#10B981', icon: 'arrow-down-circle', isFixed: false, isSystem: false, sortOrder: 4 },
  { name: 'Other Income',    slug: 'other-income',    type: 'income',     color: '#34D399', icon: 'plus-circle',  isFixed: false, isSystem: true,  sortOrder: 5 },

  // ── EXPENSES — FIXED ───────────────────────────────────────────────
  { name: 'Home Loan EMI',   slug: 'home-loan',       type: 'expense',    color: '#EF4444', icon: 'home',         isFixed: true,  isSystem: false, sortOrder: 10 },
  { name: 'Maa',             slug: 'maa',             type: 'expense',    color: '#EC4899', icon: 'heart',        isFixed: true,  isSystem: false, sortOrder: 11 },
  { name: 'MacBook EMI',     slug: 'macbook-emi',     type: 'expense',    color: '#F59E0B', icon: 'laptop',       isFixed: true,  isSystem: false, sortOrder: 12 },
  { name: 'Airtel',          slug: 'airtel',          type: 'expense',    color: '#F59E0B', icon: 'wifi',         isFixed: true,  isSystem: false, sortOrder: 13 },
  { name: 'Jio',             slug: 'jio',             type: 'expense',    color: '#F59E0B', icon: 'smartphone',   isFixed: true,  isSystem: false, sortOrder: 14 },
  { name: 'Subscriptions',   slug: 'subscriptions',   type: 'expense',    color: '#8B5CF6', icon: 'tv-2',         isFixed: true,  isSystem: false, sortOrder: 15 },

  // ── EXPENSES — VARIABLE ────────────────────────────────────────────
  { name: 'Utilities',       slug: 'utilities',       type: 'expense',    color: '#F59E0B', icon: 'zap',          isFixed: false, isSystem: false, sortOrder: 20 },
  { name: 'Office Travel',   slug: 'office-travel',   type: 'expense',    color: '#6366F1', icon: 'car',          isFixed: false, isSystem: false, sortOrder: 21 },
  { name: 'Food & Dining',   slug: 'food-dining',     type: 'expense',    color: '#F97316', icon: 'utensils',     isFixed: false, isSystem: false, sortOrder: 22 },
  { name: 'Shopping',        slug: 'shopping',        type: 'expense',    color: '#06B6D4', icon: 'shopping-bag', isFixed: false, isSystem: false, sortOrder: 23 },
  { name: 'Credit Card',     slug: 'credit-card',     type: 'expense',    color: '#EF4444', icon: 'credit-card',  isFixed: false, isSystem: false, sortOrder: 24 },
  { name: 'Mecako',          slug: 'mecako',          type: 'expense',    color: '#EC4899', icon: 'tag',          isFixed: false, isSystem: false, sortOrder: 25 },
  { name: 'Miscellaneous',   slug: 'misc',            type: 'expense',    color: '#94A3B8', icon: 'more-horizontal', isFixed: false, isSystem: true, sortOrder: 26 },

  // ── INVESTMENTS ────────────────────────────────────────────────────
  { name: 'Mutual Funds',    slug: 'mutual-funds',    type: 'investment', color: '#0EA5E9', icon: 'trending-up',  isFixed: false, isSystem: false, sortOrder: 30 },
  { name: 'Indian Stocks',   slug: 'indian-stocks',   type: 'investment', color: '#0EA5E9', icon: 'bar-chart-2',  isFixed: false, isSystem: false, sortOrder: 31 },
  { name: 'US Stocks',       slug: 'us-stocks',       type: 'investment', color: '#3B82F6', icon: 'globe',        isFixed: false, isSystem: false, sortOrder: 32 },
  { name: 'Crypto',          slug: 'crypto',          type: 'investment', color: '#F59E0B', icon: 'bitcoin',      isFixed: false, isSystem: false, sortOrder: 33 },
  { name: 'Silver',          slug: 'silver',          type: 'investment', color: '#94A3B8', icon: 'circle',       isFixed: false, isSystem: false, sortOrder: 34 },
  { name: 'Atal Pension',    slug: 'atal-pension',    type: 'investment', color: '#10B981', icon: 'shield',       isFixed: true,  isSystem: false, sortOrder: 35 },
  { name: 'PPF',             slug: 'ppf',             type: 'investment', color: '#10B981', icon: 'piggy-bank',   isFixed: false, isSystem: false, sortOrder: 36 },

  // ── SAVINGS ────────────────────────────────────────────────────────
  { name: 'Savings',         slug: 'savings',         type: 'savings',    color: '#10B981', icon: 'landmark',     isFixed: false, isSystem: true,  sortOrder: 40 },
] as const

async function main() {
  console.log('🌱 Seeding default categories template...')
  console.log('Note: Categories are seeded per-user at onboarding, not globally.')
  console.log('Run createDefaultCategories(userId) from lib/utils/categories.ts to seed for a specific user.')
  console.log('✅ Seed complete')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
