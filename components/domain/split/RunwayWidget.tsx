'use client'
import { Wallet, Flame, CalendarClock, HandCoins } from 'lucide-react'
import { formatINR, formatCompact } from '@/lib/utils/currency'

interface Props {
  fundsAvailable: number // paise (contributions − spend)
  burnRate: number // paise / month
  totalContributions: number // paise
}

function Metric({ icon: Icon, label, value, tint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tint: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center">
          <Icon className={`w-3.5 h-3.5 ${tint}`} />
        </span>
        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-xl font-bold text-zinc-100 tabular-nums">{value}</p>
    </div>
  )
}

export function RunwayWidget({ fundsAvailable, burnRate, totalContributions }: Props) {
  const runwayMonths = burnRate > 0 ? fundsAvailable / burnRate : Infinity
  const runwayLabel = !isFinite(runwayMonths) ? '∞' : runwayMonths <= 0 ? '0' : runwayMonths.toFixed(1)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Metric icon={Wallet} label="Funds available" value={formatCompact(Math.max(0, fundsAvailable))} tint="text-emerald-400" />
      <Metric icon={Flame} label="Burn / month" value={formatCompact(burnRate)} tint="text-rose-400" />
      <Metric icon={CalendarClock} label="Runway (months)" value={runwayLabel} tint="text-amber-400" />
      <Metric icon={HandCoins} label="Contributions" value={formatINR(totalContributions)} tint="text-sky-400" />
    </div>
  )
}
