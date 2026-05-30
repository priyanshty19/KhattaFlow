import { describe, it, expect } from 'vitest'
import {
  computeShares,
  computeBalances,
  minimizeSettlements,
  applySettlements,
  computeDirectSettlements,
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

describe('computeDirectSettlements', () => {
  it('produces a direct debt from each non-payer to the payer', () => {
    const expenses: ExpenseForBalance[] = [
      { paidById: 'a', shares: [{ memberId: 'a', amount: 1000 }, { memberId: 'b', amount: 1000 }, { memberId: 'c', amount: 1000 }] },
    ]
    const transfers = computeDirectSettlements(expenses)
    expect(transfers).toHaveLength(2)
    expect(transfers).toContainEqual({ fromMemberId: 'b', toMemberId: 'a', amount: 1000 })
    expect(transfers).toContainEqual({ fromMemberId: 'c', toMemberId: 'a', amount: 1000 })
  })

  it('nets reciprocal debts between two members into one direction', () => {
    const expenses: ExpenseForBalance[] = [
      // a paid; b owes a 1000
      { paidById: 'a', shares: [{ memberId: 'a', amount: 1000 }, { memberId: 'b', amount: 1000 }] },
      // b paid; a owes b 300
      { paidById: 'b', shares: [{ memberId: 'a', amount: 300 }, { memberId: 'b', amount: 300 }] },
    ]
    const transfers = computeDirectSettlements(expenses)
    expect(transfers).toEqual([{ fromMemberId: 'b', toMemberId: 'a', amount: 700 }])
  })

  it('does NOT simplify chains the way minimizeSettlements does', () => {
    // a paid for {a,b}; b paid for {b,c}. Direct: b→a and c→b (a chain remains).
    const expenses: ExpenseForBalance[] = [
      { paidById: 'a', shares: [{ memberId: 'a', amount: 500 }, { memberId: 'b', amount: 500 }] },
      { paidById: 'b', shares: [{ memberId: 'b', amount: 500 }, { memberId: 'c', amount: 500 }] },
    ]
    const direct = computeDirectSettlements(expenses)
    expect(direct).toContainEqual({ fromMemberId: 'b', toMemberId: 'a', amount: 500 })
    expect(direct).toContainEqual({ fromMemberId: 'c', toMemberId: 'b', amount: 500 })
  })

  it('applies recorded settlements to reduce the outstanding direct debt', () => {
    const expenses: ExpenseForBalance[] = [
      { paidById: 'a', shares: [{ memberId: 'a', amount: 1000 }, { memberId: 'b', amount: 1000 }] },
    ]
    const transfers = computeDirectSettlements(expenses, [{ fromMemberId: 'b', toMemberId: 'a', amount: 1000 }])
    expect(transfers).toEqual([])
  })
})

// Apply a settlement set back onto balances and return the residual net per member.
// A correct settlement set drives every residual to exactly zero.
function residualNets(
  balances: { memberId: string; net: number }[],
  transfers: { fromMemberId: string; toMemberId: string; amount: number }[],
) {
  const net = new Map(balances.map((b) => [b.memberId, b.net]))
  for (const t of transfers) {
    // debtor pays (net rises toward 0), creditor receives (net falls toward 0)
    net.set(t.fromMemberId, (net.get(t.fromMemberId) ?? 0) + t.amount)
    net.set(t.toMemberId, (net.get(t.toMemberId) ?? 0) - t.amount)
  }
  return net
}

describe('Splitwise parity — Simplified vs Itemised reconcile identically', () => {
  // A Goa-Trip-style group: 3 members, 3 expenses with mixed participants and split types.
  const expenses: ExpenseForBalance[] = [
    // P paid 50,00,000 split equally across all three (paise)
    { paidById: 'p', shares: [
      { memberId: 'p', amount: 16_66_668_00 },
      { memberId: 'm2', amount: 16_66_666_00 },
      { memberId: 'marc', amount: 16_66_666_00 },
    ] },
    // Me2 paid 10,00,000 split between P and Me2 only
    { paidById: 'm2', shares: [
      { memberId: 'p', amount: 5_00_000_00 },
      { memberId: 'm2', amount: 5_00_000_00 },
    ] },
    // MARC paid 12,30,142 split by percentage across all three
    { paidById: 'marc', shares: [
      { memberId: 'p', amount: 4_10_047_00 },
      { memberId: 'm2', amount: 4_10_047_00 },
      { memberId: 'marc', amount: 4_10_048_00 },
    ] },
  ]

  const gross = computeBalances(expenses)
  const ids = ['p', 'm2', 'marc']

  it('balances net to zero across the group', () => {
    expect(gross.reduce((s, b) => s + b.net, 0)).toBe(0)
  })

  it('Simplified set zeroes everyone and uses at most n-1 transfers', () => {
    const simplified = minimizeSettlements(gross.map((b) => ({ memberId: b.memberId, net: b.net })))
    expect(simplified.length).toBeLessThanOrEqual(ids.length - 1)
    const residual = residualNets(gross, simplified)
    for (const id of ids) expect(residual.get(id)).toBe(0)
  })

  it('Itemised set zeroes everyone too (may use more transfers — shows real chains)', () => {
    const itemised = computeDirectSettlements(expenses)
    const residual = residualNets(gross, itemised)
    for (const id of ids) expect(residual.get(id)).toBe(0)
    // itemised never simplifies, so it should have >= as many transfers as simplified
    const simplified = minimizeSettlements(gross.map((b) => ({ memberId: b.memberId, net: b.net })))
    expect(itemised.length).toBeGreaterThanOrEqual(simplified.length)
  })

  it('never emits both directions between the same pair (no A→B and B→A)', () => {
    const itemised = computeDirectSettlements(expenses)
    const seen = new Set<string>()
    for (const t of itemised) {
      expect(seen.has(`${t.toMemberId}|${t.fromMemberId}`)).toBe(false)
      seen.add(`${t.fromMemberId}|${t.toMemberId}`)
    }
  })

  it('stays consistent after a recorded settlement (both views reconcile to the remainder)', () => {
    const recorded = [{ fromMemberId: 'p', toMemberId: 'marc', amount: 1_00_000_00 }]
    const netBalances = applySettlements(gross, recorded)

    const simplified = minimizeSettlements(netBalances.map((b) => ({ memberId: b.memberId, net: b.net })))
    const itemised = computeDirectSettlements(expenses, recorded)

    for (const id of ids) {
      expect(residualNets(netBalances, simplified).get(id)).toBe(0)
      expect(residualNets(netBalances, itemised).get(id)).toBe(0)
    }
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
