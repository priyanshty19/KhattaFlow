'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, CreditCard, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface UserCard {
  id: string
  cardName: string
  bank: string
  last4: string | null
  creditLimit: number | null
  statementDay: number | null
  dueDay: number | null
}

const BANKS: { label: string; value: string }[] = [
  { label: 'HDFC',               value: 'HDFC'              },
  { label: 'SBI',                value: 'SBI'               },
  { label: 'ICICI',              value: 'ICICI Bank'         },
  { label: 'Axis',               value: 'Axis Bank'          },
  { label: 'Kotak',              value: 'Kotak'              },
  { label: 'American Express',   value: 'American Express'   },
  { label: 'IndusInd',           value: 'Induslnd Bank'      },
  { label: 'Yes Bank',           value: 'Yes Bank'           },
  { label: 'RBL',                value: 'RBL'                },
  { label: 'Standard Chartered', value: 'Standard Chartered' },
  { label: 'Citi',               value: 'Citi'               },
  { label: 'Other',              value: 'Other'              },
]

function formatLimit(paise: number | null): string {
  if (!paise) return '—'
  const rupees = paise / 100
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`
  if (rupees >= 1000) return `₹${Math.round(rupees / 1000)}K`
  return `₹${rupees.toLocaleString('en-IN')}`
}

interface AddCardDrawerProps {
  onClose: () => void
  onSaved: () => void
}

function AddCardDrawer({ onClose, onSaved }: AddCardDrawerProps) {
  const [bank, setBank] = useState('')
  const [cardName, setCardName] = useState('')
  const [last4, setLast4] = useState('')
  const [limitRs, setLimitRs] = useState('')
  const [statementDay, setStatementDay] = useState('')
  const [dueDay, setDueDay] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!bank || !cardName) { setError('Bank and card name are required.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/credit-cards/my-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank,
          cardName,
          last4: last4 || null,
          creditLimit: limitRs ? Number(limitRs) : null,  // API converts to paise via toPaise()
          statementDay: statementDay ? Number(statementDay) : null,
          dueDay: dueDay ? Number(dueDay) : null,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      onSaved()
      onClose()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full sm:max-w-md bg-zinc-900 border border-zinc-700/40 rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl mx-4 mb-0 sm:mb-0 z-10">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-zinc-100">Add Credit Card</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Bank */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400 font-medium">Bank <span className="text-red-400">*</span></label>
            <select
              value={bank}
              onChange={e => setBank(e.target.value)}
              className="w-full px-3 py-2.5 bg-zinc-800/60 border border-zinc-700/60 focus:border-emerald-500/60 rounded-lg text-sm text-zinc-100 outline-none transition-all"
            >
              <option value="">Select bank…</option>
              {BANKS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>

          {/* Card Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400 font-medium">Card Name <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={cardName}
              onChange={e => setCardName(e.target.value)}
              placeholder="e.g. Regalia Gold, SimplyCLICK"
              className="w-full px-3 py-2.5 bg-zinc-800/60 border border-zinc-700/60 focus:border-emerald-500/60 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-all"
            />
          </div>

          {/* Last 4 digits */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400 font-medium">Last 4 Digits <span className="text-zinc-600">(optional)</span></label>
            <input
              type="text"
              value={last4}
              onChange={e => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="1234"
              maxLength={4}
              className="w-full px-3 py-2.5 bg-zinc-800/60 border border-zinc-700/60 focus:border-emerald-500/60 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-all tabular-nums"
            />
          </div>

          {/* Credit limit */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400 font-medium">Credit Limit (₹) <span className="text-zinc-600">(optional)</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">₹</span>
              <input
                type="number"
                value={limitRs}
                onChange={e => setLimitRs(e.target.value)}
                placeholder="200000"
                className="w-full pl-8 pr-4 py-2.5 bg-zinc-800/60 border border-zinc-700/60 focus:border-emerald-500/60 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-all tabular-nums"
              />
            </div>
          </div>

          {/* Statement + Due day */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400 font-medium">Statement Day <span className="text-zinc-600">(1–31)</span></label>
              <input
                type="number"
                value={statementDay}
                onChange={e => setStatementDay(e.target.value)}
                min={1} max={31}
                placeholder="15"
                className="w-full px-3 py-2.5 bg-zinc-800/60 border border-zinc-700/60 focus:border-emerald-500/60 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-all tabular-nums"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400 font-medium">Due (days after stmt) </label>
              <input
                type="number"
                value={dueDay}
                onChange={e => setDueDay(e.target.value)}
                min={1} max={60}
                placeholder="20"
                className="w-full px-3 py-2.5 bg-zinc-800/60 border border-zinc-700/60 focus:border-emerald-500/60 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-all tabular-nums"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-zinc-950 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {saving ? 'Saving…' : 'Add Card'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function MyCardsTab() {
  const [cards, setCards] = useState<UserCard[]>([])
  const [loading, setLoading] = useState(true)
  const [showDrawer, setShowDrawer] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchCards = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/credit-cards/my-cards')
      const data = await res.json()
      setCards(data.cards ?? [])
    } catch {
      setCards([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCards() }, [fetchCards])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await fetch(`/api/credit-cards/my-cards/${id}`, { method: 'DELETE' })
      setCards(prev => prev.filter(c => c.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">My Cards</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Track your existing credit cards in one place.</p>
        </div>
        <button
          onClick={() => setShowDrawer(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg text-sm font-semibold transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" /> Add Card
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-20 bg-zinc-900 border border-zinc-700/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[320px] bg-zinc-900 border border-zinc-700/40 rounded-xl p-8 text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center">
            <CreditCard className="w-7 h-7 text-zinc-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-300">No cards yet</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
              Add your existing credit cards to keep track of limits, statement dates, and due dates.
            </p>
          </div>
          <button
            onClick={() => setShowDrawer(true)}
            className="flex items-center gap-1.5 px-4 py-2 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 rounded-lg text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" /> Add your first card
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map(card => (
            <div key={card.id} className="bg-zinc-900 border border-zinc-700/40 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5 text-zinc-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-zinc-100">{card.cardName}</span>
                  {card.last4 && (
                    <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                      ••••{card.last4}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-zinc-500">{card.bank}</span>
                  {card.creditLimit && (
                    <>
                      <span className="text-zinc-700">•</span>
                      <span className="text-xs text-zinc-500">Limit {formatLimit(card.creditLimit)}</span>
                    </>
                  )}
                  {card.statementDay && (
                    <>
                      <span className="text-zinc-700">•</span>
                      <span className="text-xs text-zinc-500">
                        Stmt day {card.statementDay}
                        {card.dueDay ? `, due +${card.dueDay}d` : ''}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleDelete(card.id)}
                disabled={deletingId === card.id}
                className={cn(
                  'shrink-0 p-2 rounded-lg transition-all',
                  deletingId === card.id
                    ? 'text-zinc-600 cursor-not-allowed'
                    : 'text-zinc-600 hover:text-red-400 hover:bg-red-500/10'
                )}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showDrawer && (
        <AddCardDrawer
          onClose={() => setShowDrawer(false)}
          onSaved={fetchCards}
        />
      )}
    </div>
  )
}
