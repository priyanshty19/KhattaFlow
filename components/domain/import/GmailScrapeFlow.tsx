'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Mail, AlertCircle, CheckCircle2 } from 'lucide-react'
import { ParsedSms } from '@/lib/engines/sms-parser-engine'

type Step = 'idle' | 'scanning' | 'preview' | 'importing' | 'done' | 'error'

interface PreviewItem extends ParsedSms { gmailMessageId?: string }

interface Category { id: string; name: string; type: string }

export function GmailScrapeFlow() {
  const [step, setStep] = useState<Step>('idle')
  const [monthsBack, setMonthsBack] = useState(3)
  const [preview, setPreview] = useState<PreviewItem[]>([])
  const [assignments, setAssignments] = useState<Record<number, string>>({})
  const [categories, setCategories] = useState<Category[]>([])
  const [importCount, setImportCount] = useState(0)
  const [connected, setConnected] = useState<boolean | null>(null)

  // Check connection status on mount
  useState(() => {
    fetch('/api/connect/gmail/status')
      .then(r => r.json())
      .then(d => setConnected(d.connected))
      .catch(() => setConnected(false))
  })

  const loadCategories = async () => {
    if (categories.length) return
    const res = await fetch('/api/categories')
    if (res.ok) setCategories(await res.json())
  }

  const handleScan = async () => {
    setStep('scanning')
    await loadCategories()
    try {
      const res = await fetch('/api/scrape/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthsBack }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (!data.count) {
        toast.info('No bank transaction emails found for this period')
        setStep('idle')
        return
      }
      setPreview(data.preview)
      setStep('preview')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Scan failed')
      setStep('error')
    }
  }

  const handleImport = async () => {
    const items = preview
      .map((p, i) => ({ parsed: p, categoryId: assignments[i] ?? '' }))
      .filter(item => item.categoryId)

    if (!items.length) { toast.error('Assign a category to at least one transaction'); return }
    setStep('importing')
    try {
      const res = await fetch('/api/scrape/gmail/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setImportCount(data.count)
      setStep('done')
      toast.success(`Imported ${data.count} transaction${data.count !== 1 ? 's' : ''}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Import failed')
      setStep('error')
    }
  }

  const reset = () => { setStep('idle'); setPreview([]); setAssignments({}) }

  if (connected === false) return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <Mail className="w-8 h-8 text-zinc-600" />
      <p className="text-zinc-400 text-sm">Connect your Gmail first from the Settings page to scan for bank emails.</p>
      <a href="/settings" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">Go to Settings →</a>
    </div>
  )

  if (step === 'done') return (
    <div className="flex flex-col items-center gap-3 py-12">
      <CheckCircle2 className="w-10 h-10 text-emerald-400" />
      <p className="text-zinc-200 font-medium">{importCount} transaction{importCount !== 1 ? 's' : ''} imported from Gmail</p>
      <button onClick={reset} className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Scan again</button>
    </div>
  )

  if (step === 'error') return (
    <div className="flex flex-col items-center gap-3 py-12">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-zinc-400 text-sm">Something went wrong.</p>
      <button onClick={reset} className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">Try again</button>
    </div>
  )

  if (step === 'preview') return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">Found <span className="text-emerald-400 font-medium">{preview.length}</span> transactions in your Gmail</p>
        <button onClick={reset} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Rescan</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
              <th className="pb-2 pr-3">Bank</th>
              <th className="pb-2 pr-3">Amount</th>
              <th className="pb-2 pr-3">Type</th>
              <th className="pb-2 pr-3">Date</th>
              <th className="pb-2">Category</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i} className="border-b border-zinc-800/50">
                <td className="py-2 pr-3 text-zinc-300">{row.bankName}</td>
                <td className="py-2 pr-3 text-zinc-200 tabular-nums">₹{(row.amount / 100).toLocaleString('en-IN')}</td>
                <td className="py-2 pr-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${row.type === 'debit' ? 'bg-red-900/40 text-red-300' : 'bg-emerald-900/40 text-emerald-300'}`}>
                    {row.type}
                  </span>
                </td>
                <td className="py-2 pr-3 text-zinc-400">{row.date ? row.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}</td>
                <td className="py-2">
                  <select
                    value={assignments[i] ?? ''}
                    onChange={e => setAssignments(a => ({ ...a, [i]: e.target.value }))}
                    className="bg-zinc-800 border border-zinc-600/40 rounded-lg text-xs text-zinc-200 px-2 py-1.5 focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="">Assign category…</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={handleImport}
        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl font-semibold text-sm transition-all"
      >
        {`Import ${Object.keys(assignments).filter(k => assignments[Number(k)]).length || preview.length} transactions`}
      </button>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/40">
        <Mail className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
        <p className="text-xs text-zinc-400">
          Scans your Gmail for transaction alert emails from HDFC, SBI, ICICI, Axis, Kotak, Yes Bank, and IndusInd.
          Only reads emails — never modifies or deletes anything.
        </p>
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
        </select>
      </div>

      <button
        onClick={handleScan}
        disabled={step === 'scanning'}
        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 rounded-xl font-semibold text-sm transition-all"
      >
        {step === 'scanning' ? 'Scanning Gmail…' : 'Scan Gmail for Bank Emails'}
      </button>
    </div>
  )
}
