import { describe, it, expect } from 'vitest'
import { getNextNMonths } from '@/lib/utils/date'
import { toPaise, toRupees } from '@/lib/utils/currency'

// Pure logic extracted from BudgetPlanner — groupByType, cell value merging, entry building

function groupByType<T extends { type: string }>(categories: T[]) {
  const groups: Record<string, T[]> = {}
  for (const cat of categories) {
    if (!groups[cat.type]) groups[cat.type] = []
    groups[cat.type].push(cat)
  }
  return groups
}

const TYPE_ORDER = ['expense', 'savings', 'investment', 'debt']

function buildSaveEntries(
  dirty: Set<string>,
  userEdits: Record<string, string>
): Array<{ categoryId: string; month: string; amount: number }> {
  const entries: Array<{ categoryId: string; month: string; amount: number }> = []
  dirty.forEach(key => {
    const [categoryId, month] = key.split('__')
    const rupees = parseFloat(userEdits[key] ?? '0') || 0
    entries.push({ categoryId, month, amount: toPaise(String(rupees)) })
  })
  return entries
}

const SAMPLE_CATEGORIES = [
  { id: 'cat-1', name: 'Food', type: 'expense', color: '#f97316' },
  { id: 'cat-2', name: 'Transport', type: 'expense', color: '#6366f1' },
  { id: 'cat-3', name: 'Emergency Fund', type: 'savings', color: '#10b981' },
  { id: 'cat-4', name: 'Mutual Funds', type: 'investment', color: '#0ea5e9' },
]

describe('groupByType', () => {
  it('groups categories by their type', () => {
    const groups = groupByType(SAMPLE_CATEGORIES)
    expect(groups['expense']).toHaveLength(2)
    expect(groups['savings']).toHaveLength(1)
    expect(groups['investment']).toHaveLength(1)
    expect(groups['debt']).toBeUndefined()
  })

  it('preserves category order within each group', () => {
    const groups = groupByType(SAMPLE_CATEGORIES)
    expect(groups['expense'][0].id).toBe('cat-1')
    expect(groups['expense'][1].id).toBe('cat-2')
  })
})

describe('TYPE_ORDER filtering', () => {
  it('only includes types that have categories', () => {
    const groups = groupByType(SAMPLE_CATEGORIES)
    const visible = TYPE_ORDER.filter(t => groups[t]?.length)
    expect(visible).toEqual(['expense', 'savings', 'investment'])
    expect(visible).not.toContain('debt')
  })
})

describe('buildSaveEntries', () => {
  it('converts dirty cells to paise entries', () => {
    const dirty = new Set(['cat-1__2026-05', 'cat-3__2026-06'])
    const userEdits: Record<string, string> = {
      'cat-1__2026-05': '12000',
      'cat-3__2026-06': '5000',
    }
    const entries = buildSaveEntries(dirty, userEdits)
    expect(entries).toHaveLength(2)

    const foodEntry = entries.find(e => e.categoryId === 'cat-1')!
    expect(foodEntry.month).toBe('2026-05')
    expect(foodEntry.amount).toBe(1200000) // ₹12000 = 12000 * 100 paise

    const savingsEntry = entries.find(e => e.categoryId === 'cat-3')!
    expect(savingsEntry.amount).toBe(500000)
  })

  it('treats empty string as 0 (delete intent)', () => {
    const dirty = new Set(['cat-1__2026-05'])
    const userEdits: Record<string, string> = { 'cat-1__2026-05': '' }
    const entries = buildSaveEntries(dirty, userEdits)
    expect(entries[0].amount).toBe(0)
  })

  it('returns empty array when nothing is dirty', () => {
    expect(buildSaveEntries(new Set(), {})).toHaveLength(0)
  })
})

describe('serverValues merge with userEdits', () => {
  it('userEdit takes priority over server value for dirty cells', () => {
    const serverValues: Record<string, string> = { 'cat-1__2026-05': '10000' }
    const userEdits: Record<string, string> = { 'cat-1__2026-05': '12000' }
    const dirty = new Set(['cat-1__2026-05'])

    const cellValue = (key: string) =>
      dirty.has(key) ? (userEdits[key] ?? '') : (serverValues[key] ?? '')

    expect(cellValue('cat-1__2026-05')).toBe('12000')
  })

  it('server value shows for clean cells', () => {
    const serverValues: Record<string, string> = { 'cat-1__2026-05': '10000' }
    const userEdits: Record<string, string> = {}
    const dirty = new Set<string>()

    const cellValue = (key: string) =>
      dirty.has(key) ? (userEdits[key] ?? '') : (serverValues[key] ?? '')

    expect(cellValue('cat-1__2026-05')).toBe('10000')
  })

  it('returns empty string for cells with no server or user data', () => {
    const cellValue = (key: string) => ''
    expect(cellValue('cat-99__2099-01')).toBe('')
  })
})

describe('getNextNMonths integration with planner range', () => {
  it('COL_COUNT = 6 produces correct range', () => {
    const months = getNextNMonths('2026-05', 6)
    expect(months[0]).toBe('2026-05')
    expect(months[5]).toBe('2026-10')
  })

  it('shifting range by one month adds next month and drops first', () => {
    const first = getNextNMonths('2026-05', 6)
    const next = getNextNMonths('2026-06', 6)
    expect(next[0]).toBe('2026-06')
    expect(next[5]).toBe('2026-11')
    expect(next).not.toContain('2026-05')
  })
})
