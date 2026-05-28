import { describe, it, expect } from 'vitest'
import { upsertBudgetSchema } from '@/lib/validations/budget'

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

describe('upsertBudgetSchema', () => {
  it('accepts a valid budget entry', () => {
    const result = upsertBudgetSchema.safeParse({
      categoryId: VALID_UUID,
      month: '2026-05',
      amount: 10000,
    })
    expect(result.success).toBe(true)
  })

  it('accepts amount = 0 (delete intent)', () => {
    const result = upsertBudgetSchema.safeParse({
      categoryId: VALID_UUID,
      month: '2026-05',
      amount: 0,
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative amount', () => {
    const result = upsertBudgetSchema.safeParse({
      categoryId: VALID_UUID,
      month: '2026-05',
      amount: -100,
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer amount', () => {
    const result = upsertBudgetSchema.safeParse({
      categoryId: VALID_UUID,
      month: '2026-05',
      amount: 100.5,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid UUID for categoryId', () => {
    const result = upsertBudgetSchema.safeParse({
      categoryId: 'not-a-uuid',
      month: '2026-05',
      amount: 5000,
    })
    expect(result.success).toBe(false)
  })

  it('rejects malformed month strings', () => {
    const badMonths = ['2026-5', '26-05', '2026/05', 'May 2026', '']
    for (const month of badMonths) {
      const result = upsertBudgetSchema.safeParse({
        categoryId: VALID_UUID,
        month,
        amount: 5000,
      })
      expect(result.success).toBe(false)
    }
  })

  it('rejects missing fields', () => {
    expect(upsertBudgetSchema.safeParse({ month: '2026-05', amount: 100 }).success).toBe(false)
    expect(upsertBudgetSchema.safeParse({ categoryId: VALID_UUID, amount: 100 }).success).toBe(false)
    expect(upsertBudgetSchema.safeParse({ categoryId: VALID_UUID, month: '2026-05' }).success).toBe(false)
  })
})
