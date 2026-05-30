'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Briefcase } from 'lucide-react'
import { SplitModal } from './SplitModal'
import { useCreateGroup } from '@/lib/queries/split'
import { cn } from '@/lib/utils/cn'
import type { SplitGroupType } from '@/constants/split-categories'

const TYPES: { id: SplitGroupType; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'personal', label: 'Friends / Outing / Trip', desc: 'Split shared expenses and settle up', icon: Users },
  { id: 'business', label: 'Business', desc: 'Pooled budget cycles & contributions', icon: Briefcase },
]

export function CreateGroupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const create = useCreateGroup()
  const [type, setType] = useState<SplitGroupType>('personal')
  const [name, setName] = useState('')

  const submit = () => {
    if (!name.trim()) return
    create.mutate(
      { name: name.trim(), type },
      {
        onSuccess: (res) => {
          onClose()
          setName('')
          router.push(`/split/${res.id}` as any)
        },
      },
    )
  }

  return (
    <SplitModal open={open} title="Create a group" onClose={onClose}>
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-2">
          {TYPES.map((t) => {
            const Icon = t.icon
            const active = type === t.id
            return (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border text-left transition-colors',
                  active ? 'border-emerald-500/50 bg-emerald-500/[0.06]' : 'border-zinc-800 hover:border-zinc-700',
                )}
              >
                <span className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', active ? 'bg-emerald-500/15' : 'bg-zinc-800')}>
                  <Icon className={cn('w-4 h-4', active ? 'text-emerald-400' : 'text-zinc-400')} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-zinc-200">{t.label}</span>
                  <span className="block text-xs text-zinc-500">{t.desc}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Group name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder={type === 'business' ? 'e.g. Acme Studio' : 'e.g. Goa Trip 2026'}
            className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <button
          onClick={submit}
          disabled={!name.trim() || create.isPending}
          className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-semibold transition-colors"
        >
          {create.isPending ? 'Creating…' : 'Create group'}
        </button>
      </div>
    </SplitModal>
  )
}
