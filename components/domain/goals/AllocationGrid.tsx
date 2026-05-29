'use client'
import { useMemo, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { VEHICLE_ORDER, VEHICLES, type Vehicle } from '@/constants/investment-returns'
import { toPaise, toRupees, formatINR } from '@/lib/utils/currency'
import { blendedReturn } from '@/lib/engines/goals-engine'
import { cn } from '@/lib/utils/cn'
import type { UpsertAllocationsInput } from '@/lib/validations/goal'

interface AllocationRow {
  vehicle: Vehicle
  monthly: string // rupees
  corpus: string // rupees
}

interface ExistingAllocation {
  vehicle: string
  monthlyAmount: number
  currentValue?: number
}

interface AllocationGridProps {
  existing?: ExistingAllocation[]
  pending?: boolean
  saveLabel?: string
  onSave: (data: UpsertAllocationsInput) => void
}

const GROUP_LABEL: Record<string, string> = {
  equity: 'Equity & Growth',
  alternative: 'Alternatives',
  fixed_income: 'Fixed Income',
}
const GROUP_ORDER = ['equity', 'alternative', 'fixed_income']

const VOL_BADGE: Record<string, string> = {
  none: 'text-emerald-400 bg-emerald-500/10',
  low: 'text-emerald-400 bg-emerald-500/10',
  medium: 'text-amber-400 bg-amber-500/10',
  high: 'text-orange-400 bg-orange-500/10',
  very_high: 'text-red-400 bg-red-500/10',
}

export function AllocationGrid({ existing, pending, saveLabel = 'Save investments', onSave }: AllocationGridProps) {
  const initialRows = useMemo<Record<Vehicle, AllocationRow>>(() => {
    const map = {} as Record<Vehicle, AllocationRow>
    for (const v of VEHICLE_ORDER) map[v] = { vehicle: v, monthly: '', corpus: '' }
    for (const a of existing ?? []) {
      const v = a.vehicle as Vehicle
      if (!map[v]) continue
      map[v] = {
        vehicle: v,
        monthly: a.monthlyAmount > 0 ? String(toRupees(a.monthlyAmount)) : '',
        corpus: (a.currentValue ?? 0) > 0 ? String(toRupees(a.currentValue ?? 0)) : '',
      }
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(existing)])

  const [rows, setRows] = useState(initialRows)

  const update = (v: Vehicle, field: 'monthly' | 'corpus', val: string) =>
    setRows((prev) => ({ ...prev, [v]: { ...prev[v], [field]: val } }))

  // live totals + blended return preview
  const { totalMonthly, totalCorpus, blended } = useMemo(() => {
    const allocations = VEHICLE_ORDER.map((v) => ({
      vehicle: v,
      monthlyAmount: toPaise(rows[v].monthly || '0'),
      currentValue: toPaise(rows[v].corpus || '0'),
    }))
    return {
      totalMonthly: allocations.reduce((s, a) => s + a.monthlyAmount, 0),
      totalCorpus: allocations.reduce((s, a) => s + (a.currentValue ?? 0), 0),
      blended: blendedReturn(allocations),
    }
  }, [rows])

  const grouped = useMemo(
    () =>
      GROUP_ORDER.map((g) => ({
        group: g,
        label: GROUP_LABEL[g],
        vehicles: VEHICLE_ORDER.filter((v) => VEHICLES[v].group === g),
      })).filter((g) => g.vehicles.length),
    [],
  )

  const handleSave = () => {
    const allocations = VEHICLE_ORDER.map((v) => ({
      vehicle: v,
      monthlyAmount: toPaise(rows[v].monthly || '0'),
      currentValue: toPaise(rows[v].corpus || '0'),
    })).filter((a) => a.monthlyAmount > 0 || (a.currentValue ?? 0) > 0)
    onSave({ allocations })
  }

  const inputClass =
    'w-full text-right text-xs px-2.5 py-2 rounded-md bg-zinc-900 border border-zinc-700/40 text-zinc-200 tabular-nums outline-none transition-colors focus:border-emerald-500/60 placeholder:text-zinc-700'

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-zinc-700/40">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-900 border-b border-zinc-700/40">
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Vehicle</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-zinc-500 w-[120px]">₹ / month</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-zinc-500 w-[130px]">Existing corpus</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(({ group, label, vehicles }) => (
              <GroupRows
                key={group}
                label={label}
                vehicles={vehicles}
                rows={rows}
                update={update}
                inputClass={inputClass}
                volBadge={VOL_BADGE}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Live summary */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-zinc-700/40 bg-zinc-900/40 px-4 py-3">
        <Stat label="Monthly investing" value={formatINR(totalMonthly)} />
        <Stat label="Existing corpus" value={formatINR(totalCorpus)} />
        <Stat label="Blended return" value={`${(blended * 100).toFixed(1)}%`} accent />
      </div>

      <div>
        <button
          onClick={handleSave}
          disabled={pending}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saveLabel}
        </button>
      </div>
    </div>
  )
}

function GroupRows({
  label,
  vehicles,
  rows,
  update,
  inputClass,
  volBadge,
}: {
  label: string
  vehicles: Vehicle[]
  rows: Record<Vehicle, AllocationRow>
  update: (v: Vehicle, field: 'monthly' | 'corpus', val: string) => void
  inputClass: string
  volBadge: Record<string, string>
}) {
  return (
    <>
      <tr className="bg-zinc-900/60 border-t border-zinc-700/40">
        <td colSpan={3} className="px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-zinc-600">
          {label}
        </td>
      </tr>
      {vehicles.map((v) => {
        const meta = VEHICLES[v]
        return (
          <tr key={v} className="border-t border-zinc-800/60 hover:bg-zinc-900/30 transition-colors">
            <td className="px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: meta.color }} />
                <span className="text-sm text-zinc-200">{meta.label}</span>
                <span className="text-[10px] text-zinc-600 tabular-nums">{(meta.rate * 100).toFixed(1)}%</span>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', volBadge[meta.volatility])}>
                  {meta.volatility.replace('_', ' ')}
                </span>
              </div>
            </td>
            <td className="px-3 py-2">
              <input
                type="number"
                min={0}
                placeholder="—"
                value={rows[v].monthly}
                onChange={(e) => update(v, 'monthly', e.target.value)}
                className={inputClass}
              />
            </td>
            <td className="px-3 py-2">
              <input
                type="number"
                min={0}
                placeholder="—"
                value={rows[v].corpus}
                onChange={(e) => update(v, 'corpus', e.target.value)}
                className={inputClass}
              />
            </td>
          </tr>
        )
      })}
    </>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-zinc-600">{label}</span>
      <span className={cn('text-sm font-semibold tabular-nums', accent ? 'text-emerald-400' : 'text-zinc-100')}>
        {value}
      </span>
    </div>
  )
}
