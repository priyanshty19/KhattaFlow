'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react'
import { ParsedSms } from '@/lib/engines/sms-parser-engine'

type Step = 'idle' | 'parsing' | 'preview' | 'importing' | 'done' | 'error'

interface PreviewItem {
  parsed: ParsedSms
  categoryId: string
}

interface Category {
  id: string
  name: string
  type: string
}

export function SMSImportFlow() {
  const [step, setStep] = useState<Step>('idle')
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<ParsedSms[]>([])
  const [failed, setFailed] = useState<string[]>([])
  const [assignments, setAssignments] = useState<Record<number, string>>({})
  const [categories, setCategories] = useState<Category[]>([])
  const [importCount, setImportCount] = useState(0)

  const loadCategories = async () => {
    if (categories.length) return
    const res = await fetch('/api/categories')
    if (res.ok) setCategories(await res.json())
  }

  const handleParse = async () => {
    if (!text.trim()) { toast.error('Paste some SMS messages first'); return }
    setStep('parsing')
    await loadCategories()
    try {
      const res = await fetch('/api/scrape/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPreview(data.parsed)
      setFailed(data.failed)
      setStep('preview')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Parse failed')
      setStep('error')
    }
  }

  const handleImport = async () => {
    const items: PreviewItem[] = preview
      .map((p, i) => ({ parsed: p, categoryId: assignments[i] ?? '' }))
      .filter(item => item.categoryId)

    if (!items.length) { toast.error('Assign a category to at least one transaction'); return }
    setStep('importing')
    try {
      const res = await fetch('/api/scrape/sms/execute', {
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

  const reset = () => { setStep('idle'); setText(''); setPreview([]); setFailed([]); setAssignments({}) }

  if (step === 'done') return (
    <div className="flex flex-col items-center gap-3 py-12">
      <CheckCircle2 className="w-10 h-10 text-emerald-400" />
      <p className="text-zinc-200 font-medium">{importCount} transaction{importCount !== 1 ? 's' : ''} imported</p>
      <button onClick={reset} className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Import more</button>
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
        <p className="text-sm text-zinc-400">
          <span className="text-emerald-400 font-medium">{preview.length}</span> parsed
          {failed.length > 0 && <span className="text-red-400 ml-2">{failed.length} failed</span>}
        </p>
        <button onClick={reset} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Start over</button>
      </div>

      {failed.length > 0 && (
        <div className="bg-red-950/30 border border-red-800/30 rounded-lg p-3">
          <p className="text-xs text-red-400 font-medium mb-2">Could not parse:</p>
          {failed.map((f, i) => <p key={i} className="text-xs text-red-300/70 truncate">{f}</p>)}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
              <th className="pb-2 pr-3">Bank</th>
              <th className="pb-2 pr-3">Amount</th>
              <th className="pb-2 pr-3">Type</th>
              <th className="pb-2 pr-3">A/c</th>
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
                <td className="py-2 pr-3 text-zinc-400 tabular-nums">{row.accountLast4 ? `···${row.accountLast4}` : '—'}</td>
                <td className="py-2 pr-3 text-zinc-400">{row.date ? row.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</td>
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
        disabled={false}
        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 rounded-xl font-semibold text-sm transition-all"
      >
        {`Import ${Object.keys(assignments).filter(k => assignments[Number(k)]).length} transaction${Object.keys(assignments).filter(k => assignments[Number(k)]).length !== 1 ? 's' : ''}`}
      </button>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/40">
        <MessageSquare className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
        <div className="text-xs text-zinc-400 space-y-1">
          <p className="font-medium text-zinc-300">How to get your bank SMS:</p>
          <p>On Android: open Messages → search your bank name → copy the transaction alerts below.</p>
          <p className="text-zinc-500 mt-2">Example formats supported:</p>
          <p className="font-mono text-zinc-500">Rs.1500 debited from A/c XX5678 on 21-May-26. UPI Ref: 123456. Avl Bal: Rs.45,000 -HDFCBK</p>
          <p className="font-mono text-zinc-500">INR 2,000 credited to your SBI A/c XX1234 on 20/05/26. Ref: NEFT987654 -SBIINB</p>
        </div>
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={10}
        placeholder={`Paste bank SMS messages here, one per line...\n\nE.g.:\nRs.1500 debited from A/c XX5678 on 21-May-26 -HDFCBK\nINR 50,000 credited to A/c XX1234 on 20-May-26 -SBIINB`}
        className="w-full bg-zinc-800 border border-zinc-600/40 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none font-mono"
      />

      <button
        onClick={handleParse}
        disabled={step === 'parsing' || !text.trim()}
        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 rounded-xl font-semibold text-sm transition-all"
      >
        {step === 'parsing' ? 'Parsing…' : 'Parse SMS Messages'}
      </button>
    </div>
  )
}
