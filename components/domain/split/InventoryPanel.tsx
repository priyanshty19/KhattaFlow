'use client'
import { useState } from 'react'
import { Plus, Package, Pencil, Trash2 } from 'lucide-react'
import { SplitModal } from './SplitModal'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { toPaise, toRupees } from '@/lib/utils/currency'
import {
  useInventory,
  useAddInventoryItem,
  useUpdateInventoryItem,
  useDeleteInventoryItem,
  type InventoryItemDTO,
} from '@/lib/queries/split'
import { categoriesFor, categoryOrderFor, getSplitCategoryMeta } from '@/constants/split-categories'

export function InventoryPanel({ groupId }: { groupId: string }) {
  const { data } = useInventory(groupId)
  const items = data?.items ?? []
  const add = useAddInventoryItem(groupId)
  const update = useUpdateInventoryItem(groupId)
  const del = useDeleteInventoryItem(groupId)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryItemDTO | null>(null)
  const [name, setName] = useState('')
  const [qtyStr, setQtyStr] = useState('1')
  const [costStr, setCostStr] = useState('')
  const [category, setCategory] = useState('')

  const catMeta = categoriesFor('business')
  const catIds = categoryOrderFor('business')
  const totalValue = items.reduce((s, i) => s + i.quantity * i.unitCost, 0)

  const openCreate = () => {
    setEditing(null)
    setName('')
    setQtyStr('1')
    setCostStr('')
    setCategory('')
    setOpen(true)
  }

  const openEdit = (item: InventoryItemDTO) => {
    setEditing(item)
    setName(item.name)
    setQtyStr(String(item.quantity))
    setCostStr(String(toRupees(item.unitCost)))
    setCategory(item.category ?? '')
    setOpen(true)
  }

  const submit = () => {
    const qty = parseInt(qtyStr, 10)
    if (!name.trim() || isNaN(qty) || qty < 0) return
    const payload = {
      name: name.trim(),
      quantity: qty,
      unitCost: costStr ? toPaise(costStr) : 0,
      category: category || undefined,
    }
    const onSuccess = () => setOpen(false)
    if (editing) update.mutate({ itemId: editing.id, data: payload }, { onSuccess })
    else add.mutate(payload, { onSuccess })
  }

  const pending = add.isPending || update.isPending

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Inventory</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Total value <CurrencyDisplay amount={totalValue} size="xs" muted />
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add item
        </button>
      </div>

      {!items.length ? (
        <div className="py-6 text-center">
          <Package className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
          <p className="text-xs text-zinc-500">No inventory yet. Track stock or assets bought with pooled funds.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((i) => {
            const cat = i.category ? getSplitCategoryMeta('business', i.category) : null
            return (
              <div key={i.id} className="flex items-center gap-2.5 p-2 rounded-xl border border-zinc-800 bg-zinc-900/40 group">
                <span className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                  <Package className="w-3.5 h-3.5 text-zinc-400" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-100 truncate">{i.name}</p>
                  <p className="text-[11px] text-zinc-500">
                    {i.quantity} × <CurrencyDisplay amount={i.unitCost} size="xs" muted />
                    {cat && <span className="ml-1" style={{ color: cat.color }}>· {cat.label}</span>}
                  </p>
                </div>
                <CurrencyDisplay amount={i.quantity * i.unitCost} size="sm" className="text-zinc-200 shrink-0" />
                <button
                  onClick={() => openEdit(i)}
                  className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-emerald-400 hover:bg-zinc-800 transition-all shrink-0"
                  aria-label="Edit item"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => del.mutate(i.id)}
                  disabled={del.isPending}
                  className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-rose-400 hover:bg-zinc-800 transition-all shrink-0"
                  aria-label="Delete item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <SplitModal open={open} title={editing ? 'Edit item' : 'Add inventory item'} onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Packaging boxes"
              className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Quantity</label>
              <input
                value={qtyStr}
                onChange={(e) => setQtyStr(e.target.value)}
                inputMode="numeric"
                placeholder="1"
                className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Unit cost (₹)</label>
              <input
                value={costStr}
                onChange={(e) => setCostStr(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 tabular-nums"
              />
            </div>
          </div>
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
          <button
            onClick={submit}
            disabled={!name.trim() || pending}
            className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-semibold transition-colors"
          >
            {pending ? 'Saving…' : editing ? 'Save changes' : 'Add item'}
          </button>
        </div>
      </SplitModal>
    </div>
  )
}
