'use client'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toPaise, toRupees } from '@/lib/utils/currency'
import { cn } from '@/lib/utils/cn'
import type { CreateGoalInput } from '@/lib/validations/goal'

const inputBase =
  'w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700/50 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-emerald-500/60'

export interface GoalFormValues {
  name: string
  targetAmount: number // paise
  targetDate: string // YYYY-MM-DD
}

interface GoalFormProps {
  initial?: Partial<GoalFormValues>
  submitLabel?: string
  pending?: boolean
  onSubmit: (values: CreateGoalInput) => void
  onCancel?: () => void
}

/** Default target date: 5 years out, first of month. */
function defaultDate(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 5)
  return d.toISOString().slice(0, 10)
}

export function GoalForm({ initial, submitLabel = 'Add goal', pending, onSubmit, onCancel }: GoalFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [amount, setAmount] = useState(
    initial?.targetAmount ? String(toRupees(initial.targetAmount)) : '',
  )
  const [date, setDate] = useState(initial?.targetDate ?? defaultDate())
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    setError(null)
    const trimmed = name.trim()
    const rupees = parseFloat(amount)
    if (!trimmed) return setError('Give your goal a name.')
    if (!rupees || rupees <= 0) return setError('Enter a target amount.')
    if (!date) return setError('Pick a target date.')
    if (new Date(date) <= new Date()) return setError('Target date must be in the future.')
    onSubmit({ name: trimmed, targetAmount: toPaise(String(rupees)), targetDate: date })
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Goal name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. House down payment"
          maxLength={80}
          className={inputBase}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Target amount (₹)</label>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="20,00,000"
            className={cn(inputBase, 'tabular-nums')}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Target date</label>
          <input
            type="date"
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={cn(inputBase, 'tabular-nums [color-scheme:dark]')}
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={submit}
          disabled={pending}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {submitLabel}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
