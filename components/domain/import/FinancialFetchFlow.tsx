'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Mail, TrendingUp, CreditCard, Landmark, ShieldCheck,
  Percent, BarChart2, AlertCircle, CheckCircle2, ChevronDown, ChevronUp,
  RefreshCw, ArrowDownCircle, ArrowUpCircle, Wallet,
} from 'lucide-react'
import { ParsedFinancialEmail, FinancialEmailType, FinancialCategoryHint } from '@/lib/engines/financial-email-parser'

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'idle' | 'scanning' | 'preview' | 'importing' | 'done' | 'error'

interface Category { id: string; name: string; type: string }

interface SectionConfig {
  key: string
  label: string
  types: FinancialEmailType[]
  icon: React.ReactNode
  hint: FinancialCategoryHint
  color: string
}

// ── Section definitions ────────────────────────────────────────────────────────

const SECTIONS: SectionConfig[] = [
  {
    key: 'transactions',
    label: 'Bank Transactions',
    types: ['bank_debit', 'bank_credit', 'salary_credit', 'upi_transaction'],
    icon: <Landmark className="w-4 h-4" />,
    hint: 'expense',
    color: 'blue',
  },
  {
    key: 'investments',
    label: 'Investments',
    types: ['mf_purchase', 'mf_sip', 'mf_redemption', 'dividend', 'stock_trade'],
    icon: <TrendingUp className="w-4 h-4" />,
    hint: 'investment',
    color: 'emerald',
  },
  {
    key: 'credit_cards',
    label: 'Credit Card Statements',
    types: ['cc_statement', 'cc_payment'],
    icon: <CreditCard className="w-4 h-4" />,
    hint: 'expense',
    color: 'purple',
  },
  {
    key: 'emis',
    label: 'Loans & EMIs',
    types: ['loan_emi'],
    icon: <Percent className="w-4 h-4" />,
    hint: 'expense',
    color: 'orange',
  },
  {
    key: 'insurance',
    label: 'Insurance',
    types: ['insurance_premium'],
    icon: <ShieldCheck className="w-4 h-4" />,
    hint: 'expense',
    color: 'red',
  },
  {
    key: 'fd_dividend',
    label: 'FD & Dividends',
    types: ['fd_interest', 'fd_maturity', 'dividend'],
    icon: <BarChart2 className="w-4 h-4" />,
    hint: 'income',
    color: 'yellow',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(paise: number) {
  return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

function fmtDate(d: Date | null | string) {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
}

function typeLabel(type: FinancialEmailType): string {
  const map: Record<FinancialEmailType, string> = {
    bank_debit: 'Debit',
    bank_credit: 'Credit',
    salary_credit: 'Salary',
    cc_statement: 'Statement',
    cc_payment: 'CC Payment',
    mf_purchase: 'MF Buy',
    mf_sip: 'SIP',
    mf_redemption: 'MF Sell',
    dividend: 'Dividend',
    stock_trade: 'Stock Trade',
    loan_emi: 'EMI',
    insurance_premium: 'Insurance',
    fd_interest: 'FD Interest',
    fd_maturity: 'FD Maturity',
    upi_transaction: 'UPI',
  }
  return map[type] ?? type
}

function typeBadgeClass(type: FinancialEmailType): string {
  if (['bank_credit', 'salary_credit', 'fd_interest', 'fd_maturity', 'dividend', 'mf_redemption'].includes(type)) {
    return 'bg-emerald-900/40 text-emerald-300'
  }
  if (['mf_purchase', 'mf_sip', 'stock_trade'].includes(type)) {
    return 'bg-blue-900/40 text-blue-300'
  }
  if (['cc_statement', 'cc_payment'].includes(type)) {
    return 'bg-purple-900/40 text-purple-300'
  }
  if (type === 'loan_emi') return 'bg-orange-900/40 text-orange-300'
  if (type === 'insurance_premium') return 'bg-red-900/40 text-red-300'
  return 'bg-zinc-800 text-zinc-400'
}

function sectionColorClass(color: string, variant: 'border' | 'text' | 'bg') {
  const map: Record<string, Record<string, string>> = {
    blue:    { border: 'border-blue-500/30',    text: 'text-blue-400',    bg: 'bg-blue-900/20' },
    emerald: { border: 'border-emerald-500/30', text: 'text-emerald-400', bg: 'bg-emerald-900/20' },
    purple:  { border: 'border-purple-500/30',  text: 'text-purple-400',  bg: 'bg-purple-900/20' },
    orange:  { border: 'border-orange-500/30',  text: 'text-orange-400',  bg: 'bg-orange-900/20' },
    red:     { border: 'border-red-500/30',     text: 'text-red-400',     bg: 'bg-red-900/20' },
    yellow:  { border: 'border-yellow-500/30',  text: 'text-yellow-400',  bg: 'bg-yellow-900/20' },
  }
  return map[color]?.[variant] ?? ''
}

// ── Metadata preview ──────────────────────────────────────────────────────────

function MetaChips({ item }: { item: ParsedFinancialEmail }) {
  const chips: string[] = []
  const m = item.metadata

  if (item.type === 'cc_statement') {
    if (m.minimumDue) chips.push(`Min due: ${fmt(m.minimumDue as number)}`)
    if (m.paymentDueDate) chips.push(`Due: ${m.paymentDueDate as string}`)
    if (m.availableLimit) chips.push(`Avail: ${fmt(m.availableLimit as number)}`)
  } else if (['mf_sip', 'mf_purchase', 'mf_redemption'].includes(item.type)) {
    if (m.fundName) chips.push(String(m.fundName).slice(0, 30))
    if (m.units) chips.push(`${m.units} units`)
    if (m.nav) chips.push(`NAV ₹${m.nav}`)
  } else if (item.type === 'stock_trade') {
    if (m.scrip) chips.push(String(m.scrip))
    if (m.quantity) chips.push(`Qty ${m.quantity}`)
    if (m.orderType) chips.push(String(m.orderType).toUpperCase())
  } else if (item.type === 'loan_emi') {
    if (m.principalComponent) chips.push(`Principal: ${fmt(m.principalComponent as number)}`)
    if (m.interestComponent) chips.push(`Interest: ${fmt(m.interestComponent as number)}`)
  } else if (item.type === 'insurance_premium') {
    if (m.policyNumber) chips.push(`Policy: ${m.policyNumber}`)
    if (m.renewalDueDate) chips.push(`Renewal: ${m.renewalDueDate}`)
  } else if (['fd_interest', 'fd_maturity'].includes(item.type)) {
    if (m.interestRate) chips.push(`Rate: ${m.interestRate}%`)
    if (m.tenure) chips.push(String(m.tenure))
    if (m.maturityAmount) chips.push(`Maturity: ${fmt(m.maturityAmount as number)}`)
  } else if (item.type === 'dividend') {
    if (m.dividendPerUnit) chips.push(`₹${m.dividendPerUnit}/unit`)
    if (m.folioNumber) chips.push(`Folio: ${m.folioNumber}`)
  }

  if (!chips.length) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {chips.map((c, i) => (
        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{c}</span>
      ))}
    </div>
  )
}

// ── Section component ─────────────────────────────────────────────────────────

interface SectionProps {
  section: SectionConfig
  items: ParsedFinancialEmail[]
  assignments: Record<string, string>
  categories: Category[]
  onAssign: (gmailId: string, catId: string) => void
  onBulkAssign: (gmailId: string[], catId: string) => void
}

function SectionPanel({ section, items, assignments, categories, onAssign, onBulkAssign }: SectionProps) {
  const [open, setOpen] = useState(true)
  const [bulkCat, setBulkCat] = useState('')

  const relevantCats = categories.filter(c => c.type === section.hint || c.type === 'expense')
  const allAssigned = items.every(i => assignments[i.gmailMessageId])

  // cc_statement rows are informational only — no import
  const isInfoOnly = section.key === 'credit_cards' && items.every(i => i.type === 'cc_statement')

  const handleBulkApply = () => {
    if (!bulkCat) return
    onBulkAssign(items.map(i => i.gmailMessageId), bulkCat)
  }

  return (
    <div className={`rounded-xl border ${sectionColorClass(section.color, 'border')} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 ${sectionColorClass(section.color, 'bg')} hover:brightness-110 transition-all`}
      >
        <div className="flex items-center gap-2">
          <span className={sectionColorClass(section.color, 'text')}>{section.icon}</span>
          <span className="text-sm font-medium text-zinc-200">{section.label}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${sectionColorClass(section.color, 'bg')} ${sectionColorClass(section.color, 'text')}`}>
            {items.length}
          </span>
          {allAssigned && !isInfoOnly && (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
      </button>

      {open && (
        <div className="bg-zinc-950/40">
          {/* Bulk assign */}
          {!isInfoOnly && items.length > 1 && (
            <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800/50">
              <span className="text-xs text-zinc-500 shrink-0">Bulk assign:</span>
              <select
                value={bulkCat}
                onChange={e => setBulkCat(e.target.value)}
                className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700/40 rounded text-xs text-zinc-300 px-2 py-1 focus:outline-none focus:border-emerald-500/50"
              >
                <option value="">Choose category…</option>
                {relevantCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button
                onClick={handleBulkApply}
                disabled={!bulkCat}
                className="text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-zinc-200 transition-colors shrink-0"
              >
                Apply all
              </button>
            </div>
          )}

          {/* Rows */}
          <div className="divide-y divide-zinc-800/40">
            {items.map((item) => (
              <div key={item.gmailMessageId} className="px-4 py-3 flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-zinc-200 font-medium truncate max-w-[280px]">
                        {item.description}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${typeBadgeClass(item.type)}`}>
                        {typeLabel(item.type)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-zinc-500">{item.institution}</span>
                      <span className="text-xs text-zinc-600">{fmtDate(item.date)}</span>
                    </div>
                    <MetaChips item={item} />
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="flex items-center gap-1">
                      {item.direction === 'credit'
                        ? <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-400" />
                        : <ArrowUpCircle className="w-3.5 h-3.5 text-red-400" />
                      }
                      <span className={`text-sm font-semibold tabular-nums ${item.direction === 'credit' ? 'text-emerald-400' : 'text-zinc-200'}`}>
                        {item.type === 'cc_statement'
                          ? fmt((item.metadata.totalOutstanding as number) ?? 0)
                          : fmt(item.amount)
                        }
                      </span>
                    </div>

                    {isInfoOnly ? (
                      <span className="text-[10px] text-zinc-600 italic">info only</span>
                    ) : (
                      <select
                        value={assignments[item.gmailMessageId] ?? ''}
                        onChange={e => onAssign(item.gmailMessageId, e.target.value)}
                        className="bg-zinc-800 border border-zinc-700/40 rounded text-[11px] text-zinc-300 px-1.5 py-1 focus:outline-none focus:border-emerald-500/50 max-w-[160px]"
                      >
                        <option value="">Category…</option>
                        {relevantCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Summary bar ───────────────────────────────────────────────────────────────

function SummaryBar({ results }: { results: ParsedFinancialEmail[] }) {
  const totals = results.reduce(
    (acc, r) => {
      if (r.type === 'cc_statement') return acc
      if (r.categoryHint === 'income') acc.income += r.amount
      else if (r.categoryHint === 'investment') acc.investments += r.amount
      else acc.expenses += r.amount
      return acc
    },
    { income: 0, expenses: 0, investments: 0 }
  )

  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: 'Income / Credits', value: totals.income, color: 'text-emerald-400' },
        { label: 'Expenses', value: totals.expenses, color: 'text-red-400' },
        { label: 'Investments', value: totals.investments, color: 'text-blue-400' },
      ].map(({ label, value, color }) => (
        <div key={label} className="bg-zinc-900 border border-zinc-700/30 rounded-xl p-3 text-center">
          <p className="text-xs text-zinc-500 mb-1">{label}</p>
          <p className={`text-base font-bold tabular-nums ${color}`}>{fmt(value)}</p>
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function FinancialFetchFlow() {
  const [step, setStep] = useState<Step>('idle')
  const [monthsBack, setMonthsBack] = useState(3)
  const [results, setResults] = useState<ParsedFinancialEmail[]>([])
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [categories, setCategories] = useState<Category[]>([])
  const [importCount, setImportCount] = useState(0)
  const [isImporting, setIsImporting] = useState(false)
  const [scanStats, setScanStats] = useState({ scanned: 0, skipped: 0 })
  const [connected, setConnected] = useState<boolean | null>(null)

  // Check connection on mount
  useState(() => {
    fetch('/api/connect/gmail/status')
      .then(r => r.json())
      .then(d => setConnected(d.connected))
      .catch(() => setConnected(false))
  })

  const loadCategories = useCallback(async () => {
    if (categories.length) return
    const res = await fetch('/api/categories')
    if (res.ok) setCategories(await res.json())
  }, [categories.length])

  const autoAssign = useCallback((items: ParsedFinancialEmail[], cats: Category[]) => {
    const auto: Record<string, string> = {}
    for (const item of items) {
      if (item.type === 'cc_statement') continue
      const match =
        cats.find(c => c.type === item.categoryHint) ??
        cats.find(c => c.type === 'expense')
      if (match) auto[item.gmailMessageId] = match.id
    }
    return auto
  }, [])

  const handleScan = async () => {
    setStep('scanning')
    const cats = await (async () => {
      if (categories.length) return categories
      const res = await fetch('/api/categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
        return data as Category[]
      }
      return [] as Category[]
    })()

    try {
      const res = await fetch('/api/financial-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthsBack }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (!data.count) {
        toast.info('No financial emails found for this period')
        setStep('idle')
        return
      }

      // Rehydrate dates (JSON loses Date objects)
      const items: ParsedFinancialEmail[] = data.results.map((r: ParsedFinancialEmail) => ({
        ...r,
        date: r.date ? new Date(r.date as unknown as string) : null,
      }))

      setResults(items)
      setScanStats({ scanned: data.scanned, skipped: data.skipped })
      setAssignments(autoAssign(items, cats))
      setStep('preview')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Scan failed')
      setStep('error')
    }
  }

  const handleImport = async () => {
    const items = results
      .filter(r => r.type !== 'cc_statement' && assignments[r.gmailMessageId])
      .map(r => ({ parsed: r, categoryId: assignments[r.gmailMessageId] }))

    if (!items.length) {
      toast.error('Assign at least one category before importing')
      return
    }

    setIsImporting(true)
    try {
      const res = await fetch('/api/financial-fetch/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setImportCount(data.count)
      setStep('done')
      toast.success(`Imported ${data.count} financial record${data.count !== 1 ? 's' : ''}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Import failed')
      setStep('error')
    } finally {
      setIsImporting(false)
    }
  }

  const handleAssign = (gmailId: string, catId: string) => {
    setAssignments(a => ({ ...a, [gmailId]: catId }))
  }

  const handleBulkAssign = (gmailIds: string[], catId: string) => {
    setAssignments(a => {
      const next = { ...a }
      gmailIds.forEach(id => { next[id] = catId })
      return next
    })
  }

  const reset = () => { setStep('idle'); setResults([]); setAssignments({}); setIsImporting(false) }

  const assignedCount = results.filter(r => r.type !== 'cc_statement' && assignments[r.gmailMessageId]).length
  const importableCount = results.filter(r => r.type !== 'cc_statement').length

  // ── Render states ─────────────────────────────────────────────────────────

  if (connected === false) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Mail className="w-8 h-8 text-zinc-600" />
        <p className="text-zinc-400 text-sm">Connect your Gmail first from the Settings page.</p>
        <a href="/settings" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
          Go to Settings →
        </a>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        <p className="text-zinc-200 font-medium">
          {importCount} financial record{importCount !== 1 ? 's' : ''} imported
        </p>
        <button onClick={reset} className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
          Scan again
        </button>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-zinc-400 text-sm">Something went wrong.</p>
        <button onClick={reset} className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
          Try again
        </button>
      </div>
    )
  }

  if (step === 'preview') {
    const visibleSections = SECTIONS.filter(s =>
      results.some(r => s.types.includes(r.type))
    )

    return (
      <div className="flex flex-col gap-4">
        {/* Scan summary */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-300">
              Found <span className="text-emerald-400 font-semibold">{results.length}</span> financial records
              {' '}<span className="text-zinc-500 text-xs">({scanStats.scanned} emails scanned, {scanStats.skipped} skipped)</span>
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {assignedCount} of {importableCount} assigned — review categories below
            </p>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Rescan
          </button>
        </div>

        <SummaryBar results={results} />

        {/* Sections */}
        <div className="flex flex-col gap-3">
          {visibleSections.map(section => {
            const sectionItems = results.filter(r => section.types.includes(r.type))
            return (
              <SectionPanel
                key={section.key}
                section={section}
                items={sectionItems}
                assignments={assignments}
                categories={categories}
                onAssign={handleAssign}
                onBulkAssign={handleBulkAssign}
              />
            )
          })}
        </div>

        {/* Import button */}
        <button
          onClick={handleImport}
          disabled={isImporting || assignedCount === 0}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 rounded-xl font-semibold text-sm transition-all"
        >
          {isImporting
            ? 'Importing…'
            : `Import ${assignedCount} record${assignedCount !== 1 ? 's' : ''}`
          }
        </button>
      </div>
    )
  }

  // ── Idle / scanning ───────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/40">
        <Wallet className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
        <div className="text-xs text-zinc-400 space-y-1">
          <p>
            Scans your Gmail for <span className="text-zinc-300">all financial emails</span> — bank debits/credits,
            credit card statements, MF SIPs, stock trades, loan EMIs, insurance premiums, FD interest, and dividends.
          </p>
          <p className="text-zinc-600">Read-only access. Nothing is modified or deleted in your Gmail.</p>
        </div>
      </div>

      {/* Coverage chips */}
      <div className="flex flex-wrap gap-1.5">
        {[
          'HDFC', 'ICICI', 'SBI', 'Axis', 'Kotak', 'Yes Bank', 'IndusInd', 'IDFC First',
          'PNB', 'Canara', 'BoB', 'Federal', 'RBL', 'Bandhan',
          'Zerodha', 'Groww', 'Upstox', 'Angel One', 'INDmoney', 'Kuvera', 'Paytm Money',
          'LIC', 'SBI Life', 'HDFC Life', 'ICICI Pru', 'Max Life',
          'CAMS', 'KFintech', '+ more',
        ].map(name => (
          <span key={name} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-500 border border-zinc-700/30">
            {name}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-zinc-400 shrink-0">Scan last</label>
        <select
          value={monthsBack}
          onChange={e => setMonthsBack(Number(e.target.value))}
          className="bg-zinc-800 border border-zinc-600/40 rounded-lg text-sm text-zinc-200 px-3 py-2 focus:outline-none focus:border-emerald-500/50"
        >
          <option value={1}>1 month</option>
          <option value={3}>3 months</option>
          <option value={6}>6 months</option>
          <option value={12}>12 months</option>
        </select>
      </div>

      <button
        onClick={handleScan}
        disabled={step === 'scanning'}
        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
      >
        {step === 'scanning' && <RefreshCw className="w-4 h-4 animate-spin" />}
        {step === 'scanning' ? 'Scanning Gmail…' : 'Fetch All Financial Data'}
      </button>
    </div>
  )
}
