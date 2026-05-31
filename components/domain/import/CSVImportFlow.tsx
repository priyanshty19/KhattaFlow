'use client'
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Papa from 'papaparse'
import { Upload, CheckCircle, AlertTriangle, FileText, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { formatINR } from '@/lib/utils/currency'

type Step = 'idle' | 'parsing' | 'validating' | 'preview' | 'importing' | 'done' | 'error'

interface ValidationResult {
  valid: any[]
  errors: { row: number; message: string }[]
  totalRows: number
  validCount: number
  errorCount: number
}

const TEMPLATE_HEADERS = ['date', 'description', 'amount', 'type', 'category', 'payment_method', 'notes']
const SAMPLE_CSV = `date,description,amount,type,category,payment_method,notes
01/05/2026,May Salary,108500,income,Salary,bank_transfer,
05/05/2026,Home Loan EMI,25000,expense,Home Loan EMI,auto_debit,
14/05/2026,HDFC MF SIP,15000,investment,Mutual Funds,auto_debit,
02/05/2026,Netflix,199,expense,Subscriptions,credit_card,
04/05/2026,Transfer to Maa,6000,expense,Maa,bank_transfer,`

function downloadTemplate() {
  const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'fingrid-template.csv'; a.click()
  URL.revokeObjectURL(url)
}

export function CSVImportFlow() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('idle')
  const [dragging, setDragging] = useState(false)
  const [filename, setFilename] = useState('')
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [error, setError] = useState('')
  const [importCount, setImportCount] = useState(0)

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) { setError('Please upload a .csv file'); setStep('error'); return }
    if (file.size > 5 * 1024 * 1024) { setError('File too large. Max 5MB.'); setStep('error'); return }

    setFilename(file.name)
    setStep('parsing')

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (parsed) => {
        setStep('validating')
        try {
          const res = await fetch('/api/import/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows: parsed.data }),
          })
          const data = await res.json()
          setResult(data)
          setStep('preview')
        } catch {
          setError('Validation failed. Check your file format.')
          setStep('error')
        }
      },
      error: () => { setError('Could not parse CSV file.'); setStep('error') },
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleImport = async () => {
    if (!result?.valid.length) return
    setStep('importing')
    try {
      const res = await fetch('/api/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: result.valid, filename }),
      })
      const data = await res.json()
      setImportCount(data.count)
      setStep('done')
    } catch {
      setError('Import failed. Please try again.')
      setStep('error')
    }
  }

  const reset = () => { setStep('idle'); setResult(null); setError(''); setFilename('') }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">

        {/* IDLE — Upload Zone */}
        {step === 'idle' && (
          <motion.div key="idle" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-all duration-200',
                dragging ? 'border-emerald-500 bg-emerald-950/20' : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-900/30'
              )}
            >
              <Upload className={cn('w-10 h-10 mx-auto mb-4', dragging ? 'text-emerald-400' : 'text-zinc-600')} />
              <p className="text-base font-medium text-zinc-300 mb-1">Drop your CSV here, or click to browse</p>
              <p className="text-sm text-zinc-600">Max 5MB · 10,000 rows</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
            </div>

            {/* Template */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-zinc-200">Expected CSV format</h3>
                <button onClick={downloadTemplate} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
                  ↓ Download template
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {TEMPLATE_HEADERS.map(h => (
                  <span key={h} className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 font-mono">{h}</span>
                ))}
              </div>
              <div className="mt-4 bg-zinc-800/50 rounded-xl p-3">
                <p className="text-xs text-zinc-600 font-mono leading-relaxed whitespace-pre">{SAMPLE_CSV.split('\n').slice(0,3).join('\n')}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* PARSING / VALIDATING */}
        {(step === 'parsing' || step === 'validating' || step === 'importing') && (
          <motion.div key="loading" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mb-4" />
            <p className="text-zinc-300 font-medium">
              {step === 'parsing' ? 'Parsing CSV…' : step === 'validating' ? 'Validating rows…' : `Importing ${result?.validCount} transactions…`}
            </p>
            <p className="text-xs text-zinc-600 mt-1">{filename}</p>
          </motion.div>
        )}

        {/* PREVIEW */}
        {step === 'preview' && result && (
          <motion.div key="preview" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label:'Total rows',  value:result.totalRows,  color:'text-zinc-300' },
                { label:'Valid',       value:result.validCount, color:'text-emerald-400' },
                { label:'Errors',      value:result.errorCount, color:result.errorCount>0?'text-red-400':'text-zinc-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                  <p className={cn('text-2xl font-bold tabular-nums', color)}>{value}</p>
                  <p className="text-xs text-zinc-500 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Errors */}
            {result.errors.length > 0 && (
              <div className="bg-red-950/20 border border-red-800/30 rounded-xl p-4">
                <p className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> {result.errorCount} rows will be skipped
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto custom-scroll">
                  {result.errors.slice(0,10).map((e, i) => (
                    <p key={i} className="text-xs text-red-300/70">Row {e.row}: {e.message}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Preview table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <p className="text-xs text-zinc-500">Preview (first 10 valid rows)</p>
              </div>
              <div className="divide-y divide-zinc-800/50 max-h-60 overflow-y-auto custom-scroll">
                {result.valid.slice(0,10).map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs text-zinc-600 w-20 shrink-0">{r.date?.slice(0,10)}</span>
                    <span className="text-sm text-zinc-300 flex-1 truncate">{r.description || '—'}</span>
                    <span className={cn('text-xs font-medium tabular-nums', r.type==='income'?'text-emerald-400':r.type==='investment'?'text-blue-400':'text-zinc-300')}>
                      {r.type === 'income' ? '+' : '−'}{formatINR(r.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={reset} className="px-5 py-3 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl text-sm transition-colors">Cancel</button>
              <button onClick={handleImport} disabled={result.validCount === 0}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl font-semibold text-sm transition-all">
                Import {result.validCount} transactions
              </button>
            </div>
          </motion.div>
        )}

        {/* DONE */}
        {step === 'done' && (
          <motion.div key="done" initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }}
            className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mb-6">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-100 mb-2">{importCount} transactions imported</h3>
            <p className="text-sm text-zinc-500 mb-8">Your historical data is now in myFinGrid.</p>
            <div className="flex gap-3">
              <button onClick={reset} className="px-5 py-3 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl text-sm transition-colors">Import another</button>
              <button onClick={() => router.push('/transactions')}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-semibold text-sm transition-all">
                View transactions →
              </button>
            </div>
          </motion.div>
        )}

        {/* ERROR */}
        {step === 'error' && (
          <motion.div key="error" initial={{ opacity:0 }} animate={{ opacity:1 }}
            className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-red-950/40 border border-red-800/40 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-base font-medium text-zinc-200 mb-1">Something went wrong</h3>
            <p className="text-sm text-zinc-500 mb-6">{error}</p>
            <button onClick={reset} className="px-5 py-3 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl text-sm transition-colors">Try again</button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
