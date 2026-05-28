// lib/engines/csv-import-engine.ts
import type { Category } from '@prisma/client'
import { parseISO, isValid, parse } from 'date-fns'

export interface RawRow {
  date: string
  description?: string
  amount: string
  type?: string
  category: string
  payment_method?: string
  notes?: string
}

export interface ValidatedRow {
  date: string          // ISO string
  description: string | null
  amount: number        // paise
  type: string
  categoryId: string
  paymentMethod: string | null
  notes: string | null
}

export interface RowError {
  row: number
  message: string
}

export interface ValidationResult {
  valid: ValidatedRow[]
  errors: RowError[]
  totalRows: number
  validCount: number
  errorCount: number
}

const DATE_FORMATS = [
  'dd/MM/yyyy',
  'MM/dd/yyyy',
  'yyyy-MM-dd',
  'd/M/yyyy',
  'dd-MM-yyyy',
  'yyyy/MM/dd',
]

function parseDate(raw: string): Date | null {
  if (!raw) return null

  // Try ISO first
  const iso = parseISO(raw)
  if (isValid(iso)) return iso

  // Try common formats
  for (const fmt of DATE_FORMATS) {
    try {
      const d = parse(raw, fmt, new Date())
      if (isValid(d)) return d
    } catch { /* continue */ }
  }

  return null
}

const TYPE_ALIASES: Record<string, string> = {
  'income': 'income',
  'salary': 'income',
  'expense': 'expense',
  'expenses': 'expense',
  'spend': 'expense',
  'investment': 'investment',
  'invest': 'investment',
  'mf': 'investment',
  'mutual fund': 'investment',
  'savings': 'savings',
  'save': 'savings',
}

const PAYMENT_ALIASES: Record<string, string> = {
  'cc': 'credit_card',
  'credit card': 'credit_card',
  'credit_card': 'credit_card',
  'card': 'credit_card',
  'upi': 'upi',
  'cash': 'cash',
  'bank': 'bank_transfer',
  'bank transfer': 'bank_transfer',
  'neft': 'bank_transfer',
  'imps': 'bank_transfer',
  'auto': 'auto_debit',
  'ecs': 'auto_debit',
}

export class CSVImportEngine {

  static validateRows(rows: RawRow[], categories: Category[]): ValidationResult {
    const valid: ValidatedRow[] = []
    const errors: RowError[] = []

    rows.forEach((row, index) => {
      const rowNum = index + 1
      const rowErrors: string[] = []

      // Date
      const date = parseDate(row.date)
      if (!date) rowErrors.push(`Invalid date: "${row.date}"`)

      // Amount
      const rawAmount = String(row.amount ?? '').replace(/[₹,\s]/g, '')
      const amount = parseFloat(rawAmount)
      if (isNaN(amount) || amount <= 0) rowErrors.push(`Invalid amount: "${row.amount}"`)

      // Type (optional — inferred from category if missing)
      const rawType = (row.type ?? '').toLowerCase().trim()
      const type = TYPE_ALIASES[rawType] ?? null

      // Category (fuzzy match)
      const category = this.fuzzyMatchCategory(row.category, categories)
      if (!category) rowErrors.push(`Unknown category: "${row.category}"`)

      // Payment method (optional)
      const rawPM = (row.payment_method ?? '').toLowerCase().trim()
      const paymentMethod = PAYMENT_ALIASES[rawPM] ?? null

      if (rowErrors.length > 0) {
        rowErrors.forEach(msg => errors.push({ row: rowNum, message: msg }))
        return
      }

      valid.push({
        date: date!.toISOString(),
        description: row.description ?? null,
        amount: Math.round(amount * 100),  // rupees → paise
        type: type ?? category!.type,
        categoryId: category!.id,
        paymentMethod,
        notes: row.notes ?? null,
      })
    })

    return {
      valid,
      errors,
      totalRows: rows.length,
      validCount: valid.length,
      errorCount: errors.length,
    }
  }

  // Normalize both strings and find best match
  static fuzzyMatchCategory(name: string, categories: Category[]): Category | null {
    if (!name) return null

    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
    const normalized = normalize(name)

    // Exact match first
    const exact = categories.find(c => normalize(c.name) === normalized)
    if (exact) return exact

    // Slug match
    const slug = normalized.replace(/\s+/g, '-')
    const slugMatch = categories.find(c => c.slug === slug)
    if (slugMatch) return slugMatch

    // Contains match (both directions)
    return categories.find(c => {
      const cn = normalize(c.name)
      return cn.includes(normalized) || normalized.includes(cn)
    }) ?? null
  }
}
