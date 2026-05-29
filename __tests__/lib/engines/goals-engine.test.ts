import { describe, it, expect } from 'vitest'
import {
  blendedReturn,
  projectCorpus,
  requiredMonthly,
  monthsUntil,
  evaluateGoal,
  monthlyTotal,
  existingCorpus,
  optimizeAllocations,
  type Allocation,
} from '@/lib/engines/goals-engine'
import { getVehicleRate } from '@/constants/investment-returns'

describe('projectCorpus', () => {
  it('returns existing corpus when months is 0', () => {
    expect(projectCorpus({ monthlyContribution: 1000, existingCorpus: 50000, annualRate: 0.12, months: 0 })).toBe(50000)
  })

  it('handles zero rate as simple sum', () => {
    // 10,000/mo for 12 months + 0 corpus, no growth = 120,000
    expect(projectCorpus({ monthlyContribution: 10000, existingCorpus: 0, annualRate: 0, months: 12 })).toBe(120000)
  })

  it('compounds a lump sum with no contributions', () => {
    // 1,00,000 at 12% for 12 months ≈ 1,12,683 (monthly compounding)
    const fv = projectCorpus({ monthlyContribution: 0, existingCorpus: 100000, annualRate: 0.12, months: 12 })
    expect(fv).toBeGreaterThan(112000)
    expect(fv).toBeLessThan(113000)
  })

  it('computes SIP future value (annuity-due) within tolerance', () => {
    // ₹10,000/mo, 12% annual, 12 months, annuity-due ≈ 1,28,093
    const fv = projectCorpus({ monthlyContribution: 10000, existingCorpus: 0, annualRate: 0.12, months: 12 })
    expect(fv).toBeGreaterThan(127000)
    expect(fv).toBeLessThan(129000)
  })
})

describe('requiredMonthly', () => {
  it('is the inverse of projectCorpus', () => {
    const months = 60
    const rate = 0.12
    const target = 5_000_000 // ₹50k in paise units (value is unit-agnostic)
    const P = requiredMonthly({ target, existingCorpus: 0, annualRate: rate, months })
    const projected = projectCorpus({ monthlyContribution: P, existingCorpus: 0, annualRate: rate, months })
    // round-trip should land essentially on target
    expect(Math.abs(projected - target)).toBeLessThan(target * 0.001)
  })

  it('returns 0 when existing corpus already exceeds target after growth', () => {
    const req = requiredMonthly({ target: 100000, existingCorpus: 100000, annualRate: 0.12, months: 12 })
    expect(req).toBe(0)
  })

  it('handles zero rate', () => {
    // need 1,20,000 over 12 months with no growth, no corpus = 10,000/mo
    expect(requiredMonthly({ target: 120000, existingCorpus: 0, annualRate: 0, months: 12 })).toBe(10000)
  })
})

describe('blendedReturn', () => {
  it('weights by monthly contribution', () => {
    const allocs: Allocation[] = [
      { vehicle: 'fd', monthlyAmount: 100 },
      { vehicle: 'indian_stocks', monthlyAmount: 100 },
    ]
    const expected = (getVehicleRate('fd') + getVehicleRate('indian_stocks')) / 2
    expect(blendedReturn(allocs)).toBeCloseTo(expected, 6)
  })

  it('falls back to current value weighting when no monthly contributions', () => {
    const allocs: Allocation[] = [{ vehicle: 'mutual_funds', monthlyAmount: 0, currentValue: 50000 }]
    expect(blendedReturn(allocs)).toBeCloseTo(getVehicleRate('mutual_funds'), 6)
  })

  it('returns 0 when nothing invested', () => {
    expect(blendedReturn([{ vehicle: 'fd', monthlyAmount: 0 }])).toBe(0)
  })
})

describe('monthsUntil', () => {
  it('counts whole months ahead', () => {
    const now = new Date('2026-01-15')
    expect(monthsUntil('2027-01-15', now)).toBe(12)
  })

  it('never returns less than 1', () => {
    const now = new Date('2026-01-15')
    expect(monthsUntil('2026-01-10', now)).toBe(1)
    expect(monthsUntil('2020-01-01', now)).toBe(1)
  })
})

describe('monthlyTotal / existingCorpus', () => {
  const allocs: Allocation[] = [
    { vehicle: 'fd', monthlyAmount: 5000, currentValue: 100000 },
    { vehicle: 'crypto', monthlyAmount: 2000, currentValue: 0 },
  ]
  it('sums monthly amounts', () => expect(monthlyTotal(allocs)).toBe(7000))
  it('sums current values', () => expect(existingCorpus(allocs)).toBe(100000))
})

describe('evaluateGoal', () => {
  const now = new Date('2026-01-01')

  it('flags a goal as behind when contributions are too low', () => {
    const goal = { name: 'House', targetAmount: 10_000_000, targetDate: '2027-01-01' }
    const allocs: Allocation[] = [{ vehicle: 'fd', monthlyAmount: 10000 }]
    const e = evaluateGoal(goal, allocs, now)
    expect(e.status).toBe('behind')
    expect(e.requiredMonthly).toBeGreaterThan(e.monthlyInvesting)
    expect(e.shortfallMonthly).toBeGreaterThan(0)
  })

  it('flags a goal as ahead when over-funded', () => {
    const goal = { name: 'Gadget', targetAmount: 100000, targetDate: '2027-01-01' }
    const allocs: Allocation[] = [{ vehicle: 'mutual_funds', monthlyAmount: 50000 }]
    const e = evaluateGoal(goal, allocs, now)
    expect(e.status).toBe('ahead')
    expect(e.shortfallMonthly).toBe(0)
  })
})

describe('optimizeAllocations', () => {
  it('flags crypto over-exposure for a balanced profile', () => {
    const allocs: Allocation[] = [
      { vehicle: 'crypto', monthlyAmount: 8000 },
      { vehicle: 'fd', monthlyAmount: 2000 },
    ]
    const out = optimizeAllocations(allocs, 'balanced')
    const crypto = out.find((s) => s.vehicle === 'crypto')
    expect(crypto?.action).toBe('decrease')
    expect(crypto?.deltaMonthly).toBeLessThan(0)
  })

  it('suggests increasing growth assets when fixed-income heavy', () => {
    const allocs: Allocation[] = [{ vehicle: 'fd', monthlyAmount: 10000 }]
    const out = optimizeAllocations(allocs, 'aggressive')
    const equityIncrease = out.find((s) => s.action === 'increase' && s.deltaMonthly > 0)
    expect(equityIncrease).toBeTruthy()
    const fd = out.find((s) => s.vehicle === 'fd')
    expect(fd?.action).toBe('decrease')
  })

  it('marks aligned allocations as maintain', () => {
    // aggressive target ~ mutual_funds .30, indian .25, us .20, crypto .10, nps .10, ppf .05
    const allocs: Allocation[] = [
      { vehicle: 'mutual_funds', monthlyAmount: 3000 },
      { vehicle: 'indian_stocks', monthlyAmount: 2500 },
      { vehicle: 'us_stocks', monthlyAmount: 2000 },
      { vehicle: 'crypto', monthlyAmount: 1000 },
      { vehicle: 'nps', monthlyAmount: 1000 },
      { vehicle: 'ppf', monthlyAmount: 500 },
    ]
    const out = optimizeAllocations(allocs, 'aggressive')
    expect(out.every((s) => s.action === 'maintain')).toBe(true)
  })
})
