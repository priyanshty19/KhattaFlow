// constants/split-categories.ts
// Expense categories for Split & Share groups.
// Business categories adapt the Mecako-Money-Manager reference list; personal
// groups use a lighter optional set (or none). label + color per category.

export interface SplitCategoryMeta {
  id: string
  label: string
  color: string
}

// ─── Business ────────────────────────────────────────────────────────────────

export const BUSINESS_CATEGORIES: Record<string, SplitCategoryMeta> = {
  inventory:         { id: 'inventory',         label: 'Inventory',         color: '#0EA5E9' },
  operations:        { id: 'operations',        label: 'Operations',        color: '#6366F1' },
  marketing:         { id: 'marketing',         label: 'Marketing / Ads',   color: '#EC4899' },
  software:          { id: 'software',          label: 'Software',          color: '#8B5CF6' },
  packaging:         { id: 'packaging',         label: 'Packaging',         color: '#F59E0B' },
  designers:         { id: 'designers',         label: 'Designers',         color: '#14B8A6' },
  printing:          { id: 'printing',          label: 'Printing',          color: '#F97316' },
  emergency_reserve: { id: 'emergency_reserve', label: 'Emergency Reserve', color: '#EF4444' },
  misc:              { id: 'misc',              label: 'Miscellaneous',     color: '#94A3B8' },
}

export const BUSINESS_CATEGORY_ORDER: string[] = [
  'inventory', 'operations', 'marketing', 'software', 'packaging',
  'designers', 'printing', 'emergency_reserve', 'misc',
]

// ─── Personal (friends / outing / trip) ───────────────────────────────────────

export const PERSONAL_CATEGORIES: Record<string, SplitCategoryMeta> = {
  food:       { id: 'food',       label: 'Food & Drinks', color: '#F59E0B' },
  stay:       { id: 'stay',       label: 'Stay',          color: '#6366F1' },
  travel:     { id: 'travel',     label: 'Travel',        color: '#0EA5E9' },
  activities: { id: 'activities', label: 'Activities',    color: '#10B981' },
  shopping:   { id: 'shopping',   label: 'Shopping',      color: '#EC4899' },
  other:      { id: 'other',      label: 'Other',         color: '#94A3B8' },
}

export const PERSONAL_CATEGORY_ORDER: string[] = [
  'food', 'stay', 'travel', 'activities', 'shopping', 'other',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export type SplitGroupType = 'personal' | 'business'

export function categoriesFor(type: SplitGroupType): Record<string, SplitCategoryMeta> {
  return type === 'business' ? BUSINESS_CATEGORIES : PERSONAL_CATEGORIES
}

export function categoryOrderFor(type: SplitGroupType): string[] {
  return type === 'business' ? BUSINESS_CATEGORY_ORDER : PERSONAL_CATEGORY_ORDER
}

export function getSplitCategoryMeta(type: SplitGroupType, id?: string | null): SplitCategoryMeta | undefined {
  if (!id) return undefined
  return categoriesFor(type)[id]
}
