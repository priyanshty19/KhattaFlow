import { format, parse, startOfMonth, endOfMonth, getDaysInMonth as fnsGetDaysInMonth, differenceInDays, parseISO } from 'date-fns'

/** Returns '2026-05' for current month */
export function getCurrentMonth(): string {
  return format(new Date(), 'yyyy-MM')
}

/** '2026-05' → Date (first of month) */
export function monthToDate(month: string): Date {
  return parse(month, 'yyyy-MM', new Date())
}

/** Date → '2026-05' */
export function getMonthString(date: Date): string {
  return format(date, 'yyyy-MM')
}

/** Date → 2026 */
export function getYear(date: Date): number {
  return date.getFullYear()
}

/** '2026-05' → '2026-04' */
export function getPreviousMonth(month: string): string {
  const d = monthToDate(month)
  d.setMonth(d.getMonth() - 1)
  return format(d, 'yyyy-MM')
}

/** '2026-05' → '2026-06' */
export function getNextMonth(month: string): string {
  const d = monthToDate(month)
  d.setMonth(d.getMonth() + 1)
  return format(d, 'yyyy-MM')
}

/** '2026-05' → 'May 2026' */
export function formatMonthLabel(month: string): string {
  return format(monthToDate(month), 'MMMM yyyy')
}

/** '2026-05' → 'May' */
export function formatMonthShort(month: string): string {
  return format(monthToDate(month), 'MMM')
}

/** Days elapsed in the given month up to today */
export function getDaysElapsed(month: string): number {
  const today = new Date()
  const currentMonth = format(today, 'yyyy-MM')
  if (month !== currentMonth) {
    // Past month — full month elapsed
    return fnsGetDaysInMonth(monthToDate(month))
  }
  return today.getDate()
}

/** Total days in a given month string */
export function getDaysInMonth(month: string): number {
  return fnsGetDaysInMonth(monthToDate(month))
}

/** Format date for display: '15 May' */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'd MMM')
}

/** Format date long: '15 May 2026' */
export function formatDateLong(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'd MMM yyyy')
}

/** Today's ISO date string */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Last N months ending at current month */
export function getLastNMonths(n: number): string[] {
  const months: string[] = []
  const d = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1)
    months.push(format(m, 'yyyy-MM'))
  }
  return months
}

/** N months starting from `start` (inclusive) */
export function getNextNMonths(start: string, n: number): string[] {
  const months: string[] = []
  let current = start
  for (let i = 0; i < n; i++) {
    months.push(current)
    current = getNextMonth(current)
  }
  return months
}
