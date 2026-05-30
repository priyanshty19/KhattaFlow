import { describe, it, expect } from 'vitest'
import {
  createGroupSchema,
  updateGroupSchema,
  inviteMemberSchema,
  updateMemberSchema,
  createExpenseSchema,
  updateExpenseSchema,
  createSettlementSchema,
  updateSettlementSchema,
  createCycleSchema,
  updateCycleSchema,
  upsertContributionSchema,
  createInventoryItemSchema,
  updateInventoryItemSchema,
} from '@/lib/validations/split'

// ── Group ────────────────────────────────────────────────────────────────────

describe('createGroupSchema', () => {
  it('accepts a minimal personal group', () => {
    const r = createGroupSchema.safeParse({ name: 'Goa Trip', type: 'personal' })
    expect(r.success).toBe(true)
  })

  it('accepts a business group with currency', () => {
    const r = createGroupSchema.safeParse({ name: 'Mecako', type: 'business', currency: 'INR' })
    expect(r.success).toBe(true)
  })

  it('rejects an empty name', () => {
    expect(createGroupSchema.safeParse({ name: '', type: 'personal' }).success).toBe(false)
  })

  it('rejects a name over 80 chars', () => {
    expect(createGroupSchema.safeParse({ name: 'x'.repeat(81), type: 'personal' }).success).toBe(false)
  })

  it('rejects an unknown type', () => {
    expect(createGroupSchema.safeParse({ name: 'X', type: 'family' }).success).toBe(false)
  })
})

describe('updateGroupSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(updateGroupSchema.safeParse({}).success).toBe(true)
  })

  it('accepts a simplifyDebts toggle on its own', () => {
    const r = updateGroupSchema.safeParse({ simplifyDebts: false })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.simplifyDebts).toBe(false)
  })

  it('rejects a non-boolean simplifyDebts', () => {
    expect(updateGroupSchema.safeParse({ simplifyDebts: 'yes' }).success).toBe(false)
  })

  it('rejects an empty rename', () => {
    expect(updateGroupSchema.safeParse({ name: '' }).success).toBe(false)
  })
})

// ── Members / invites ──────────────────────────────────────────────────────────

describe('inviteMemberSchema', () => {
  it('accepts a valid email', () => {
    expect(inviteMemberSchema.safeParse({ email: 'a@b.com' }).success).toBe(true)
  })

  it('accepts an email with an optional name', () => {
    expect(inviteMemberSchema.safeParse({ email: 'a@b.com', name: 'Alice' }).success).toBe(true)
  })

  it('rejects a malformed email', () => {
    expect(inviteMemberSchema.safeParse({ email: 'not-an-email' }).success).toBe(false)
  })
})

describe('updateMemberSchema', () => {
  it('accepts a role change', () => {
    expect(updateMemberSchema.safeParse({ role: 'owner' }).success).toBe(true)
  })

  it('rejects an unknown role', () => {
    expect(updateMemberSchema.safeParse({ role: 'admin' }).success).toBe(false)
  })
})

// ── Expenses ─────────────────────────────────────────────────────────────────

const baseExpense = {
  description: 'Dinner',
  amount: 120000, // paise
  paidById: 'm1',
  participants: ['m1', 'm2'],
  date: '2026-05-30',
}

describe('createExpenseSchema', () => {
  it('accepts an equal split without inputs', () => {
    const r = createExpenseSchema.safeParse({ ...baseExpense, splitType: 'equal' })
    expect(r.success).toBe(true)
  })

  it('requires inputs for an exact split', () => {
    const r = createExpenseSchema.safeParse({ ...baseExpense, splitType: 'exact' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.flatten().fieldErrors.inputs).toBeTruthy()
  })

  it('accepts an exact split with inputs', () => {
    const r = createExpenseSchema.safeParse({
      ...baseExpense,
      splitType: 'exact',
      inputs: [{ memberId: 'm1', value: 60000 }, { memberId: 'm2', value: 60000 }],
    })
    expect(r.success).toBe(true)
  })

  it('requires inputs for percentage and shares', () => {
    expect(createExpenseSchema.safeParse({ ...baseExpense, splitType: 'percentage' }).success).toBe(false)
    expect(createExpenseSchema.safeParse({ ...baseExpense, splitType: 'shares' }).success).toBe(false)
  })

  it('rejects a non-integer amount', () => {
    expect(createExpenseSchema.safeParse({ ...baseExpense, amount: 1200.5, splitType: 'equal' }).success).toBe(false)
  })

  it('rejects a zero or negative amount', () => {
    expect(createExpenseSchema.safeParse({ ...baseExpense, amount: 0, splitType: 'equal' }).success).toBe(false)
    expect(createExpenseSchema.safeParse({ ...baseExpense, amount: -5, splitType: 'equal' }).success).toBe(false)
  })

  it('rejects an empty participants list', () => {
    expect(createExpenseSchema.safeParse({ ...baseExpense, participants: [], splitType: 'equal' }).success).toBe(false)
  })

  it('rejects a malformed date', () => {
    expect(createExpenseSchema.safeParse({ ...baseExpense, date: '30-05-2026', splitType: 'equal' }).success).toBe(false)
  })

  it('accepts an optional cycleId and category', () => {
    const r = createExpenseSchema.safeParse({ ...baseExpense, splitType: 'equal', category: 'inventory', cycleId: 'c1' })
    expect(r.success).toBe(true)
  })

  it('updateExpenseSchema mirrors createExpenseSchema', () => {
    expect(updateExpenseSchema.safeParse({ ...baseExpense, splitType: 'equal' }).success).toBe(true)
    expect(updateExpenseSchema.safeParse({ ...baseExpense, splitType: 'exact' }).success).toBe(false)
  })
})

// ── Settlements ────────────────────────────────────────────────────────────────

describe('createSettlementSchema', () => {
  it('accepts a valid settlement', () => {
    const r = createSettlementSchema.safeParse({ fromMemberId: 'm1', toMemberId: 'm2', amount: 5000 })
    expect(r.success).toBe(true)
  })

  it('rejects a non-positive amount', () => {
    expect(createSettlementSchema.safeParse({ fromMemberId: 'm1', toMemberId: 'm2', amount: 0 }).success).toBe(false)
  })

  it('rejects a missing counterpart', () => {
    expect(createSettlementSchema.safeParse({ fromMemberId: 'm1', amount: 100 }).success).toBe(false)
  })
})

describe('updateSettlementSchema', () => {
  it('accepts marking settled', () => {
    expect(updateSettlementSchema.safeParse({ isSettled: true }).success).toBe(true)
  })

  it('accepts an empty patch', () => {
    expect(updateSettlementSchema.safeParse({}).success).toBe(true)
  })
})

// ── Business: cycles ─────────────────────────────────────────────────────────

const baseCycle = {
  name: 'Jun – Aug 2026',
  startDate: '2026-06-01',
  endDate: '2026-08-31',
}

describe('createCycleSchema', () => {
  it('accepts a minimal cycle', () => {
    expect(createCycleSchema.safeParse(baseCycle).success).toBe(true)
  })

  it('accepts allocations, buffer and status', () => {
    const r = createCycleSchema.safeParse({
      ...baseCycle,
      bufferAmount: 50000,
      totalBudget: 150000,
      allocations: [{ category: 'inventory', amount: 100000 }],
      status: 'draft',
    })
    expect(r.success).toBe(true)
  })

  it('rejects an unknown status', () => {
    expect(createCycleSchema.safeParse({ ...baseCycle, status: 'archived' }).success).toBe(false)
  })

  it('rejects a malformed date', () => {
    expect(createCycleSchema.safeParse({ ...baseCycle, startDate: '2026/06/01' }).success).toBe(false)
  })

  it('rejects a negative allocation amount', () => {
    expect(createCycleSchema.safeParse({ ...baseCycle, allocations: [{ category: 'x', amount: -1 }] }).success).toBe(false)
  })
})

describe('updateCycleSchema', () => {
  it('accepts a status-only patch (draft for later)', () => {
    const r = updateCycleSchema.safeParse({ status: 'draft' })
    expect(r.success).toBe(true)
  })

  it('accepts a completed status', () => {
    expect(updateCycleSchema.safeParse({ status: 'completed' }).success).toBe(true)
  })

  it('accepts an empty patch', () => {
    expect(updateCycleSchema.safeParse({}).success).toBe(true)
  })

  it('rejects an empty name when provided', () => {
    expect(updateCycleSchema.safeParse({ name: '' }).success).toBe(false)
  })
})

// ── Business: contributions ──────────────────────────────────────────────────

describe('upsertContributionSchema', () => {
  it('accepts required + paid amounts', () => {
    expect(upsertContributionSchema.safeParse({ memberId: 'm1', requiredAmount: 100000, paidAmount: 50000 }).success).toBe(true)
  })

  it('accepts a memberId with no amounts', () => {
    expect(upsertContributionSchema.safeParse({ memberId: 'm1' }).success).toBe(true)
  })

  it('rejects a missing memberId', () => {
    expect(upsertContributionSchema.safeParse({ paidAmount: 100 }).success).toBe(false)
  })

  it('rejects a negative paidAmount', () => {
    expect(upsertContributionSchema.safeParse({ memberId: 'm1', paidAmount: -1 }).success).toBe(false)
  })
})

// ── Business: inventory ──────────────────────────────────────────────────────

describe('createInventoryItemSchema', () => {
  it('accepts a valid item', () => {
    const r = createInventoryItemSchema.safeParse({ name: 'Boxes', quantity: 100, unitCost: 1500 })
    expect(r.success).toBe(true)
  })

  it('rejects a negative quantity', () => {
    expect(createInventoryItemSchema.safeParse({ name: 'Boxes', quantity: -1, unitCost: 1500 }).success).toBe(false)
  })

  it('rejects a non-integer unit cost', () => {
    expect(createInventoryItemSchema.safeParse({ name: 'Boxes', quantity: 1, unitCost: 15.5 }).success).toBe(false)
  })
})

describe('updateInventoryItemSchema', () => {
  it('accepts a partial patch', () => {
    expect(updateInventoryItemSchema.safeParse({ quantity: 50 }).success).toBe(true)
  })

  it('accepts an empty patch', () => {
    expect(updateInventoryItemSchema.safeParse({}).success).toBe(true)
  })
})
