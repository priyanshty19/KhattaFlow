import { describe, it, expect } from 'vitest'
import {
  computeShares,
  computeBalances,
  minimizeSettlements,
  applySettlements,
  poolObligations,
  computeContributionStatus,
  type ExpenseForBalance,
} from '@/lib/engines/split-engine'

const sumShares = (shares: { amount: number }[]) => shares.reduce((s, x) => s + x.amount, 0)

describe('computeShares — equal', () => {
  it('splits evenly when divisible', () => {
    const shares = computeShares({ amount: 9000, splitType: 'equal', participants: ['a', 'b', 'c'], payerId: 'a' })
    expect(shares).toEqual([
      { memberId: 'a', amount: 3000 },
      { memberId: 'b', amount: 3000 },
      { memberId: 'c', amount: 3000 },
    ])
  })

  it('absorbs the rounding remainder into the payer', () => {
    const shares = computeShares({ amount: 1000, splitType: 'equal', participants: ['a', 'b', 'c'], payerId: 'b' })
    expect(sumShares(shares)).toBe(1000)
    // 1000/3 -> base 333, remainder 1 to payer b
    expect(shares.find((s) => s.memberId === 'b')!.amount).toBe(334)
    expect(shares.find((s) => s.memberId === 'a')!.amount).toBe(333)
    expect(shares.find((s) => s.memberId === 'c')!.amount).toBe(333)
  })

  it('gives remainder to first participant when payer not included', () => {
    const shares = computeShares({ amount: 1000, splitType: 'equal', participants: ['a', 'b', 'c'], payerId: 'z' })
    expect(sumShares(shares)).toBe(1000)
    expect(shares.find((s) => s.memberId === 'a')!.amount).toBe(334)
  })
})

describe('computeShares — exact', () => {
  it('keeps exact inputs that already sum to the total', () => {
    const shares = computeShares({
      amount: 10000,
      splitType: 'exact',
      participants: ['a', 'b'],
      payerId: 'a',
      inputs: [{ memberId: 'a', value: 6000 }, { memberId: 'b', value: 4000 }],
    })
    expect(sumShares(shares)).toBe(10000)
    expect(shares.find((s) => s.memberId === 'b')!.amount).toBe(4000)
  })

  it('absorbs a discrepancy into the payer', () => {
    const shares = computeShares({
      amount: 10000,
      splitType: 'exact',
      participants: ['a', 'b'],
      payerId: 'a',
      inputs: [{ memberId: 'a', value: 5000 }, { memberId: 'b', value: 4000 }],
    })
    expect(sumShares(shares)).toBe(10000)
    expect(shares.find((s) => s.memberId === 'a')!.amount).toBe(6000) // 5000 + 1000 diff
  })
})

describe('computeShares — percentage', () => {
  it('splits by percentage and sums to total', () => {
    const shares = computeShares({
      amount: 10000,
      splitType: 'percentage',
      participants: ['a', 'b', 'c'],
      payerId: 'a',
      inputs: [{ memberId: 'a', value: 50 }, { memberId: 'b', value: 30 }, { memberId: 'c', value: 20 }],
    })
    expect(sumShares(shares)).toBe(10000)
    expect(shares.find((s) => s.memberId === 'b')!.amount).toBe(3000)
    expect(shares.find((s) => s.memberId === 'c')!.amount).toBe(2000)
  })

  it('handles non-clean percentages by absorbing remainder to payer', () => {
    const shares = computeShares({
      amount: 1000,
      splitType: 'percentage',
      participants: ['a', 'b', 'c'],
      payerId: 'a',
      inputs: [{ memberId: 'a', value: 33.33 }, { memberId: 'b', value: 33.33 }, { memberId: 'c', value: 33.34 }],
    })
    expect(sumShares(shares)).toBe(1000)
  })
})

describe('computeShares — shares', () => {
  it('splits proportionally to weights', () => {
    const shares = computeShares({
      amount: 12000,
      splitType: 'shares',
      participants: ['a', 'b', 'c'],
      payerId: 'a',
      inputs: [{ memberId: 'a', value: 1 }, { memberId: 'b', value: 2 }, { memberId: 'c', value: 3 }],
    })
    expect(sumShares(shares)).toBe(12000)
    expect(shares.find((s) => s.memberId === 'c')!.amount).toBe(6000) // 3/6 of 12000
  })

  it('falls back to equal when no weights given', () => {
    const shares = computeShares({ amount: 9000, splitType: 'shares', participants: ['a', 'b', 'c'], payerId: 'a', inputs: [] })
    expect(shares.every((s) => s.amount === 3000)).toBe(true)
  })
})

describe('computeBalances', () => {
  it('nets paid minus owed and sums to zero across the group', () => {
    // a pays 9000 split equally among a,b,c (3000 each)
    const expenses: ExpenseForBalance[] = [
      { paidById: 'a', shares: [{ memberId: 'a', amount: 3000 }, { memberId: 'b', amount: 3000 }, { memberId: 'c', amount: 3000 }] },
    ]
    const balances = computeBalances(expenses)
    expect(balances.find((b) => b.memberId === 'a')!.net).toBe(6000) // paid 9000, owed 3000
    expect(balances.find((b) => b.memberId === 'b')!.net).toBe(-3000)
    expect(balances.find((b) => b.memberId === 'c')!.net).toBe(-3000)
    expect(balances.reduce((s, b) => s + b.net, 0)).toBe(0)
  })
})

describe('minimizeSettlements', () => {
  it('settles a simple two-party debt', () => {
    const transfers = minimizeSettlements([
      { memberId: 'a', net: 6000 },
      { memberId: 'b', net: -3000 },
      { memberId: 'c', net: -3000 },
    ])
    expect(transfers).toHaveLength(2)
    expect(transfers.every((t) => t.toMemberId === 'a')).toBe(true)
    expect(transfers.reduce((s, t) => s + t.amount, 0)).toBe(6000)
  })

  it('produces at most n-1 transfers and clears all balances', () => {
    const balances = [
      { memberId: 'a', net: 5000 },
      { memberId: 'b', net: 3000 },
      { memberId: 'c', net: -2000 },
      { memberId: 'd', net: -6000 },
    ]
    const transfers = minimizeSettlements(balances)
    expect(transfers.length).toBeLessThanOrEqual(balances.length - 1)
    // net flow per member matches their balance
    const flow = new Map<string, number>()
    for (const t of transfers) {
      flow.set(t.toMemberId, (flow.get(t.toMemberId) ?? 0) + t.amount)
      flow.set(t.fromMemberId, (flow.get(t.fromMemberId) ?? 0) - t.amount)
    }
    for (const b of balances) expect(flow.get(b.memberId) ?? 0).toBe(b.net)
  })

  it('returns nothing when everyone is settled', () => {
    expect(minimizeSettlements([{ memberId: 'a', net: 0 }, { memberId: 'b', net: 0 }])).toEqual([])
  })
})

describe('applySettlements', () => {
  it('zeroes balances once the outstanding debt is settled', () => {
    const gross = computeBalances([
      { paidById: 'a', shares: [{ memberId: 'a', amount: 2500 }, { memberId: 'b', amount: 2500 }] },
    ])
    // a is owed 2500, b owes 2500
    expect(gross.find((x) => x.memberId === 'a')?.net).toBe(2500)
    const net = applySettlements(gross, [{ fromMemberId: 'b', toMemberId: 'a', amount: 2500 }])
    expect(net.find((x) => x.memberId === 'a')?.net).toBe(0)
    expect(net.find((x) => x.memberId === 'b')?.net).toBe(0)
    // and suggestions derived from the netted balances are empty
    expect(minimizeSettlements(net.map((b) => ({ memberId: b.memberId, net: b.net })))).toEqual([])
  })

  it('reflects a partial settlement', () => {
    const gross = computeBalances([
      { paidById: 'a', shares: [{ memberId: 'a', amount: 5000 }, { memberId: 'b', amount: 5000 }] },
    ])
    const net = applySettlements(gross, [{ fromMemberId: 'b', toMemberId: 'a', amount: 2000 }])
    expect(net.find((x) => x.memberId === 'a')?.net).toBe(3000)
    expect(net.find((x) => x.memberId === 'b')?.net).toBe(-3000)
  })

  it('leaves balances untouched when there are no settlements', () => {
    const gross = computeBalances([
      { paidById: 'a', shares: [{ memberId: 'a', amount: 1000 }, { memberId: 'b', amount: 1000 }] },
    ])
    expect(applySettlements(gross, [])).toEqual(gross)
  })
})

describe('poolObligations', () => {
  it('splits a pool equally and sums exactly to the total', () => {
    const obs = poolObligations({ totalAmount: 10000, memberIds: ['a', 'b', 'c'] })
    expect(obs.reduce((s, o) => s + o.requiredAmount, 0)).toBe(10000)
    // remainder of 1 goes to first member
    expect(obs[0].requiredAmount).toBe(3334)
    expect(obs[1].requiredAmount).toBe(3333)
  })

  it('returns empty for no members', () => {
    expect(poolObligations({ totalAmount: 10000, memberIds: [] })).toEqual([])
  })
})

describe('computeContributionStatus', () => {
  it('is complete when paid meets the requirement', () => {
    expect(computeContributionStatus({ requiredAmount: 5000, paidAmount: 5000 })).toBe('complete')
  })
  it('is pending when nothing paid and not overdue', () => {
    expect(computeContributionStatus({ requiredAmount: 5000, paidAmount: 0 })).toBe('pending')
  })
  it('is partial when some paid and not overdue', () => {
    expect(computeContributionStatus({ requiredAmount: 5000, paidAmount: 2000 })).toBe('partial')
  })
  it('is overdue when past the due date and not complete', () => {
    const past = new Date('2020-01-01')
    expect(computeContributionStatus({ requiredAmount: 5000, paidAmount: 2000, dueDate: past })).toBe('overdue')
  })
  it('stays complete even if past due', () => {
    const past = new Date('2020-01-01')
    expect(computeContributionStatus({ requiredAmount: 5000, paidAmount: 5000, dueDate: past })).toBe('complete')
  })
})
