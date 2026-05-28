import { describe, it, expect } from 'vitest'
import {
  getCurrentMonth,
  getPreviousMonth,
  getNextMonth,
  getNextNMonths,
  getLastNMonths,
  formatMonthLabel,
  formatMonthShort,
  getDaysInMonth,
  getDaysElapsed,
  todayISO,
  formatDate,
  formatDateLong,
} from '@/lib/utils/date'

describe('getPreviousMonth', () => {
  it('goes back one month', () => {
    expect(getPreviousMonth('2026-05')).toBe('2026-04')
  })
  it('wraps year boundary correctly', () => {
    expect(getPreviousMonth('2026-01')).toBe('2025-12')
  })
})

describe('getNextMonth', () => {
  it('advances one month', () => {
    expect(getNextMonth('2026-05')).toBe('2026-06')
  })
  it('wraps year boundary correctly', () => {
    expect(getNextMonth('2025-12')).toBe('2026-01')
  })
})

describe('getNextNMonths', () => {
  it('returns n months starting from start (inclusive)', () => {
    const result = getNextNMonths('2026-05', 6)
    expect(result).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'])
  })

  it('handles year boundary in the range', () => {
    const result = getNextNMonths('2025-10', 6)
    expect(result).toEqual(['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'])
  })

  it('returns exactly n items', () => {
    expect(getNextNMonths('2026-01', 1)).toHaveLength(1)
    expect(getNextNMonths('2026-01', 12)).toHaveLength(12)
  })

  it('first element equals start', () => {
    const result = getNextNMonths('2026-08', 3)
    expect(result[0]).toBe('2026-08')
  })
})

describe('getLastNMonths', () => {
  it('returns n months ending at current month', () => {
    const current = getCurrentMonth()
    const result = getLastNMonths(3)
    expect(result).toHaveLength(3)
    expect(result[2]).toBe(current)
  })

  it('months are in chronological order', () => {
    const result = getLastNMonths(6)
    for (let i = 1; i < result.length; i++) {
      expect(result[i] > result[i - 1]).toBe(true)
    }
  })
})

describe('formatMonthLabel', () => {
  it('formats as full month name + year', () => {
    expect(formatMonthLabel('2026-05')).toBe('May 2026')
    expect(formatMonthLabel('2026-01')).toBe('January 2026')
    expect(formatMonthLabel('2025-12')).toBe('December 2025')
  })
})

describe('formatMonthShort', () => {
  it('formats as abbreviated month name', () => {
    expect(formatMonthShort('2026-05')).toBe('May')
    expect(formatMonthShort('2026-01')).toBe('Jan')
    expect(formatMonthShort('2026-12')).toBe('Dec')
  })
})

describe('getDaysInMonth', () => {
  it('returns 31 for May', () => {
    expect(getDaysInMonth('2026-05')).toBe(31)
  })
  it('returns 30 for April', () => {
    expect(getDaysInMonth('2026-04')).toBe(30)
  })
  it('returns 28 for non-leap February', () => {
    expect(getDaysInMonth('2026-02')).toBe(28)
  })
  it('returns 29 for leap year February', () => {
    expect(getDaysInMonth('2024-02')).toBe(29)
  })
})

describe('getDaysElapsed', () => {
  it('returns full month days for a past month', () => {
    expect(getDaysElapsed('2025-01')).toBe(31)
    expect(getDaysElapsed('2024-02')).toBe(29)
  })

  it('returns a value between 1 and 31 for current month', () => {
    const current = getCurrentMonth()
    const elapsed = getDaysElapsed(current)
    expect(elapsed).toBeGreaterThanOrEqual(1)
    expect(elapsed).toBeLessThanOrEqual(31)
  })
})

describe('todayISO', () => {
  it('returns yyyy-MM-dd format', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('formatDate', () => {
  it('formats a date string as "d MMM"', () => {
    expect(formatDate('2026-05-17')).toBe('17 May')
    expect(formatDate('2026-01-01')).toBe('1 Jan')
  })
})

describe('formatDateLong', () => {
  it('formats a date string as "d MMM yyyy"', () => {
    expect(formatDateLong('2026-05-17')).toBe('17 May 2026')
  })
})
