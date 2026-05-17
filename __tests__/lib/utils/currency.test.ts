import { describe, it, expect } from 'vitest'
import { toPaise, toRupees, formatINR, formatCompact, formatNumber } from '@/lib/utils/currency'

describe('toPaise', () => {
  it('converts integer rupees', () => {
    expect(toPaise(1000)).toBe(100000)
    expect(toPaise(1)).toBe(100)
    expect(toPaise(0)).toBe(0)
  })

  it('converts decimal rupees', () => {
    expect(toPaise(1.5)).toBe(150)
    expect(toPaise(99.99)).toBe(9999)
  })

  it('converts rupee string with commas and symbol', () => {
    expect(toPaise('1,08,500')).toBe(10850000)
    expect(toPaise('₹12,000')).toBe(1200000)
    expect(toPaise('500')).toBe(50000)
  })

  it('rounds fractional paise', () => {
    expect(toPaise(0.001)).toBe(0)
    expect(toPaise(0.009)).toBe(1)
  })
})

describe('toRupees', () => {
  it('converts paise to rupees', () => {
    expect(toRupees(100000)).toBe(1000)
    expect(toRupees(100)).toBe(1)
    expect(toRupees(0)).toBe(0)
    expect(toRupees(150)).toBe(1.5)
  })
})

describe('toPaise / toRupees roundtrip', () => {
  it('is lossless for integer rupee amounts', () => {
    const amounts = [0, 100, 500, 12000, 108500, 1000000]
    for (const rupees of amounts) {
      expect(toRupees(toPaise(rupees))).toBe(rupees)
    }
  })
})

describe('formatCompact', () => {
  it('formats lakhs', () => {
    expect(formatCompact(10000000)).toBe('₹1.0L')
    expect(formatCompact(25000000)).toBe('₹2.5L')
  })

  it('formats thousands', () => {
    expect(formatCompact(1000000)).toBe('₹10K')
    expect(formatCompact(500000)).toBe('₹5K')
  })

  it('formats small amounts without suffix', () => {
    expect(formatCompact(50000)).toBe('₹500')
    expect(formatCompact(100)).toBe('₹1')
  })
})

describe('formatNumber', () => {
  it('formats paise as plain rupee number with commas', () => {
    expect(formatNumber(10850000)).toBe('1,08,500')
    expect(formatNumber(100000)).toBe('1,000')
  })
})
