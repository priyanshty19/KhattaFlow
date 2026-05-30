'use client'
import { useMemo, useState } from 'react'
import { SplitModal } from './SplitModal'
import { useAddExpense, useUpdateExpense, type SplitExpenseDTO, type SplitMemberDTO } from '@/lib/queries/split'
import { computeShares, type SplitType } from '@/lib/engines/split-engine'
import { toPaise, toRupees } from '@/lib/utils/currency'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { categoriesFor, categoryOrderFor, type SplitGroupType } from '@/constants/split-categories'
import { todayISO } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'

const SPLIT_TYPES: { id: SplitType; label: string }[] = [
  { id: 'equal', label: 'Equal' },
  { id: 'exact', label: 'Exact' },
  { id: 'percentage', label: 'Percent' },
  { id: 'shares', label: 'Shares' },
]

interface Props {
  groupId: string
  groupType: SplitGroupType
  members: SplitMemberDTO[]
  myMemberId: string
  cycleId?: string
  /** When provided, the modal edits this expense instead of creating a new one. */
  expense?: SplitExpenseDTO | null
  open: boolean
  onClose: () => void
}

export function AddExpenseModal({ groupId, groupType, members, myMemberId, cycleId, expense, open, onClose }: Props) {
  const add = useAddExpense(groupId)
  const update = useUpdateExpense(groupId)
  const isEdit = !!expense
  const active = members.filter((m) => m.status === 'active' || m.userId)

  // Derive per-member input strings from an existing expense's shares so edit
  // mode pre-fills the right values for the saved split type.
  const initialInputs = (): Record<string, string> => {
    if (!expense) return {}
    const out: Record<string, string> = {}
    if (expense.splitType === 'exact') {
      for (const s of expense.shares) out[s.memberId] = String(toRupees(s.amount))
    } else if (expense.splitType === 'percentage') {
      for (const s of expense.shares) out[s.memberId] = String(Math.round((s.amount / expense.amount) * 100))
    } else if (expense.splitType === 'shares') {
      // Reconstruct integer weights proportional to share amounts.
      for (const s of expense.shares) out[s.memberId] = String(s.amount)
    }
    return out
  }

  const [description, setDescription] = useState(expense?.description ?? '')
  const [amountStr, setAmountStr] = useState(expense ? String(toRupees(expense.amount)) : '')
  const [paidById, setPaidById] = useState(expense?.paidById ?? myMemberId)
  const [splitType, setSplitType] = useState<SplitType>(expense?.splitType ?? 'equal')
  const [participants, setParticipants] = useState<string[]>(
    expense ? expense.shares.map((s) => s.memberId) : active.map((m) => m.id),
  )
  const [inputs, setInputs] = useState<Record<string, string>>(initialInputs)
  const [category, setCategory] = useState<string>(expense?.category ?? '')
  const [date, setDate] = useState(expense?.date ?? todayISO())

  const amountPaise = amountStr ? toPaise(amountStr) : 0
  const catMeta = categoriesFor(groupType)
  const catIds = categoryOrderFor(groupType)

  const toggleParticipant = (id: string) => {
    setParticipants((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }

  // Live preview of computed shares (and a validity check for exact/percent).
  const { preview, valid, hint } = useMemo(() => {
    if (!amountPaise || !participants.length) return { preview: [] as { memberId: string; amount: number }[], valid: false, hint: '' }
    const shareInputs = participants.map((memberId) => {
      const raw = inputs[memberId] ?? ''
      let value = 0
      if (splitType === 'exact') value = raw ? toPaise(raw) : 0
      else value = raw ? parseFloat(raw) : 0
      return { memberId, value }
    })
    const preview = computeShares({ amount: amountPaise, splitType, participants, payerId: paidById, inputs: shareInputs })

    let valid = true
    let hint = ''
    if (splitType === 'exact') {
      const sum = shareInputs.reduce((s, x) => s + (x.value || 0), 0)
      valid = sum === amountPaise
      if (!valid) hint = `Inputs sum to ₹${(sum / 100).toFixed(2)} — must equal ₹${(amountPaise / 100).toFixed(2)}`
    } else if (splitType === 'percentage') {
      const sum = shareInputs.reduce((s, x) => s + (x.value || 0), 0)
      valid = Math.round(sum) === 100
      if (!valid) hint = `Percentages sum to ${sum}% — must equal 100%`
    } else if (splitType === 'shares') {
      const sum = shareInputs.reduce((s, x) => s + (x.value || 0), 0)
      valid = sum > 0
      if (!valid) hint = 'Enter at least one share weight'
    }
    return { preview, valid, hint }
  }, [amountPaise, participants, inputs, splitType, paidById])

  const pending = add.isPending || update.isPending
  const canSubmit = !!description.trim() && amountPaise > 0 && participants.length > 0 && valid && !pending

  const submit = () => {
    if (!canSubmit) return
    const payloadInputs =
      splitType === 'equal'
        ? undefined
        : participants.map((memberId) => {
            const raw = inputs[memberId] ?? ''
            const value = splitType === 'exact' ? (raw ? toPaise(raw) : 0) : raw ? parseFloat(raw) : 0
            return { memberId, value }
          })
    const data = {
      description: description.trim(),
      amount: amountPaise,
      paidById,
      splitType,
      participants,
      inputs: payloadInputs,
      category: category || undefined,
      date,
      cycleId: expense?.cycleId ?? cycleId,
    }
    const onSuccess = () => {
      onClose()
      if (!isEdit) {
        setDescription('')
        setAmountStr('')
        setInputs({})
        setSplitType('equal')
      }
    }
    if (isEdit) update.mutate({ expenseId: expense!.id, data }, { onSuccess })
    else add.mutate(data, { onSuccess })
  }

  return (
    <SplitModal open={open} title={isEdit ? 'Edit expense' : 'Add expense'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
          <input
            autoFocus
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Dinner, Hotel, Ad spend"
            className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Amount (₹)</label>
            <input
              inputMode="decimal"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0"
              className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Paid by</label>
          <select
            value={paidById}
            onChange={(e) => setPaidById(e.target.value)}
            className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
          >
            {active.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {catIds.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Category (optional)</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">None</option>
              {catIds.map((id) => (
                <option key={id} value={id}>{catMeta[id].label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Split type switch */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Split</label>
          <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
            {SPLIT_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setSplitType(t.id)}
                className={cn(
                  'h-8 rounded-lg text-xs font-medium transition-colors',
                  splitType === t.id ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Participants + per-member inputs */}
        <div className="space-y-1.5">
          {active.map((m) => {
            const included = participants.includes(m.id)
            const share = preview.find((p) => p.memberId === m.id)?.amount ?? 0
            return (
              <div key={m.id} className={cn('flex items-center gap-2.5 p-2 rounded-xl border', included ? 'border-zinc-800 bg-zinc-900/50' : 'border-transparent opacity-50')}>
                <button
                  onClick={() => toggleParticipant(m.id)}
                  className={cn('w-5 h-5 rounded-md border flex items-center justify-center shrink-0', included ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600')}
                >
                  {included && <span className="text-zinc-950 text-[10px] font-bold">✓</span>}
                </button>
                <span className="flex-1 text-sm text-zinc-200 truncate">{m.name}</span>
                {included && splitType !== 'equal' && (
                  <input
                    value={inputs[m.id] ?? ''}
                    onChange={(e) => setInputs((s) => ({ ...s, [m.id]: e.target.value }))}
                    inputMode="decimal"
                    placeholder={splitType === 'percentage' ? '%' : splitType === 'shares' ? 'wt' : '₹'}
                    className="w-20 h-8 px-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm text-right tabular-nums focus:outline-none focus:border-emerald-500/50"
                  />
                )}
                {included && (
                  <span className="w-20 text-right text-xs text-zinc-500 tabular-nums">
                    <CurrencyDisplay amount={share} size="xs" muted />
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {hint && <p className="text-xs text-amber-400">{hint}</p>}

        <button
          onClick={submit}
          disabled={!canSubmit}
          className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-semibold transition-colors"
        >
          {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Add expense'}
        </button>
      </div>
    </SplitModal>
  )
}
