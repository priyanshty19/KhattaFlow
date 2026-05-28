/**
 * Currency utilities — all amounts stored as paise (integer)
 * Display layer converts: paise / 100 → rupees
 */

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const INR_FORMATTER_DECIMAL = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Format paise as ₹1,08,500 */
export function formatINR(paise: number, showDecimal = false): string {
  const rupees = paise / 100
  return showDecimal ? INR_FORMATTER_DECIMAL.format(rupees) : INR_FORMATTER.format(rupees)
}

/** Format rupees directly (when already converted) */
export function formatRupees(rupees: number): string {
  return INR_FORMATTER.format(rupees)
}

/** Convert rupees string/number to paise integer */
export function toPaise(rupees: number | string): number {
  const n = typeof rupees === 'string' ? parseFloat(rupees.replace(/[₹,\s]/g, '')) : rupees
  return Math.round(n * 100)
}

/** Convert paise to rupees */
export function toRupees(paise: number): number {
  return paise / 100
}

/** Compact format: ₹1.1L, ₹23K */
export function formatCompact(paise: number): string {
  const rupees = paise / 100
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(0)}K`
  return `₹${rupees.toFixed(0)}`
}

/** Format as plain number with commas (no ₹ symbol) */
export function formatNumber(paise: number): string {
  return new Intl.NumberFormat('en-IN').format(paise / 100)
}
