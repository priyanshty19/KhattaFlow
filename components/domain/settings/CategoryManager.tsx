'use client'
import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/lib/queries'
import { cn } from '@/lib/utils/cn'
import { toast } from 'sonner'

const TABS = [
  { id: 'expense',    label: 'Debt',        color: 'text-red-400',     activeBg: 'bg-red-500/10 border-red-500/30' },
  { id: 'savings',    label: 'Savings',     color: 'text-purple-400',  activeBg: 'bg-purple-500/10 border-purple-500/30' },
  { id: 'investment', label: 'Investments', color: 'text-blue-400',    activeBg: 'bg-blue-500/10 border-blue-500/30' },
  { id: 'income',     label: 'Incoming',    color: 'text-emerald-400', activeBg: 'bg-emerald-500/10 border-emerald-500/30' },
]

const PRESET_COLORS = [
  '#ef4444','#f97316','#eab308','#22c55e','#10b981',
  '#06b6d4','#3b82f6','#8b5cf6','#ec4899','#94a3b8',
]

interface EditState {
  name: string
  color: string
  isFixed: boolean
}

function CategoryRow({
  cat,
  onSaved,
}: {
  cat: any
  onSaved: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [form, setForm] = useState<EditState>({ name: cat.name, color: cat.color, isFixed: cat.isFixed })
  const { mutate: update, isPending: saving } = useUpdateCategory()
  const { mutate: remove, isPending: deleting } = useDeleteCategory()

  const handleSave = () => {
    if (!form.name.trim()) return
    update(
      { id: cat.id, name: form.name.trim(), color: form.color, isFixed: form.isFixed },
      { onSuccess: () => { setEditing(false); onSaved() } }
    )
  }

  const handleDelete = () => {
    remove(cat.id, { onSuccess: () => setConfirmDelete(false) })
  }

  if (editing) {
    return (
      <div className="px-4 py-3 bg-zinc-800/50 border border-zinc-600/50 rounded-xl space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="flex-1 bg-zinc-800 border border-zinc-600/50 rounded-lg px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50"
            autoFocus
          />
          <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={form.isFixed}
              onChange={e => setForm(f => ({ ...f, isFixed: e.target.checked }))}
              className="accent-emerald-500 w-3.5 h-3.5"
            />
            Fixed
          </label>
        </div>

        {/* Color swatches */}
        <div className="flex items-center gap-2">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setForm(f => ({ ...f, color: c }))}
              className={cn('w-5 h-5 rounded-full border-2 transition-all', form.color === c ? 'border-white scale-125' : 'border-transparent hover:scale-110')}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={form.color}
            onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
            className="w-5 h-5 rounded-full cursor-pointer bg-transparent border-0 p-0"
            title="Custom color"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 text-xs font-semibold rounded-lg transition-all"
          >
            <Check className="w-3 h-3" /> Save
          </button>
        </div>
      </div>
    )
  }

  if (confirmDelete) {
    return (
      <div className="px-4 py-3 bg-red-950/30 border border-red-500/30 rounded-xl">
        <p className="text-sm text-red-300 mb-1 font-medium">Delete "{cat.name}"?</p>
        <p className="text-xs text-red-400/70 mb-3">This will permanently delete the category and <strong>all its transactions</strong>. This cannot be undone.</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setConfirmDelete(false)}
            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-all"
          >
            <Trash2 className="w-3 h-3" /> {deleting ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-zinc-800/30 transition-colors">
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
      <span className="flex-1 text-sm text-zinc-200">{cat.name}</span>
      <div className="flex items-center gap-1.5">
        {cat.isFixed && (
          <span className="text-[10px] font-semibold bg-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded">Fixed</span>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => { setForm({ name: cat.name, color: cat.color, isFixed: cat.isFixed }); setEditing(true) }}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setConfirmDelete(true)}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function AddCategoryForm({ type, onDone }: { type: string; onDone: () => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#10b981')
  const [isFixed, setIsFixed] = useState(false)
  const { mutate: create, isPending } = useCreateCategory()

  const handleSubmit = () => {
    if (!name.trim()) return
    create(
      { name: name.trim(), type, color, isFixed },
      {
        onSuccess: () => {
          setName(''); setIsFixed(false)
          onDone()
        },
      }
    )
  }

  return (
    <div className="px-4 py-3 border border-dashed border-zinc-600/50 rounded-xl space-y-3">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Category name…"
          className="flex-1 bg-zinc-800 border border-zinc-600/50 rounded-lg px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
          autoFocus
        />
        <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={isFixed}
            onChange={e => setIsFixed(e.target.checked)}
            className="accent-emerald-500 w-3.5 h-3.5"
          />
          Fixed
        </label>
      </div>

      <div className="flex items-center gap-2">
        {PRESET_COLORS.map(c => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={cn('w-5 h-5 rounded-full border-2 transition-all', color === c ? 'border-white scale-125' : 'border-transparent hover:scale-110')}
            style={{ backgroundColor: c }}
          />
        ))}
        <input
          type="color"
          value={color}
          onChange={e => setColor(e.target.value)}
          className="w-5 h-5 rounded-full cursor-pointer bg-transparent border-0 p-0"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onDone} className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isPending || !name.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 text-xs font-semibold rounded-lg transition-all"
        >
          <Plus className="w-3 h-3" /> {isPending ? 'Adding…' : 'Add category'}
        </button>
      </div>
    </div>
  )
}

export function CategoryManager() {
  const [activeTab, setActiveTab] = useState('expense')
  const [showAdd, setShowAdd] = useState(false)
  const { data: allCategories = [], refetch } = useCategories()

  const tabCategories = (allCategories as any[]).filter((c: any) => c.type === activeTab)

  return (
    <div className="space-y-4">
      {/* Tab selector */}
      <div className="flex gap-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setShowAdd(false) }}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all',
              activeTab === tab.id ? tab.activeBg + ' ' + tab.color : 'border-zinc-600/40 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500/50'
            )}
          >
            {tab.label}
            <span className="ml-1.5 text-[10px] opacity-60">
              {(allCategories as any[]).filter((c: any) => c.type === tab.id).length}
            </span>
          </button>
        ))}
      </div>

      {/* Category list */}
      <div className="bg-zinc-900 border border-zinc-600/40 rounded-xl overflow-hidden">
        {tabCategories.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-600 text-center">No categories yet. Add one below.</p>
        ) : (
          <div className="divide-y divide-zinc-800/50 py-1">
            {tabCategories.map((cat: any) => (
              <CategoryRow key={cat.id} cat={cat} onSaved={() => refetch()} />
            ))}
          </div>
        )}

        {/* Add form or button */}
        <div className="p-3 border-t border-zinc-800/50">
          {showAdd ? (
            <AddCategoryForm type={activeTab} onDone={() => setShowAdd(false)} />
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800/40 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add category
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
