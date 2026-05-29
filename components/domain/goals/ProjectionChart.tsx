'use client'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'
import { formatCompact, formatINR } from '@/lib/utils/currency'

interface SeriesPoint {
  month: number
  value: number // paise
}

interface ProjectionChartProps {
  series: SeriesPoint[]
  target: number // paise
  status: 'on_track' | 'behind' | 'ahead'
}

const STATUS_COLOR: Record<string, string> = {
  on_track: '#10B981',
  ahead: '#10B981',
  behind: '#F59E0B',
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const months = payload[0]?.payload?.month ?? 0
  const yrs = Math.floor(months / 12)
  const mo = months % 12
  const label = [yrs ? `${yrs}y` : '', mo ? `${mo}m` : ''].filter(Boolean).join(' ') || 'Today'
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 shadow-xl text-xs">
      <p className="text-zinc-400 mb-1.5 font-medium">{label} from now</p>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full shrink-0 bg-emerald-400" />
        <span className="text-zinc-400">Projected:</span>
        <span className="text-zinc-100 font-semibold tabular-nums">{formatINR(payload[0].value)}</span>
      </div>
    </div>
  )
}

export function ProjectionChart({ series, target, status }: ProjectionChartProps) {
  const color = STATUS_COLOR[status] ?? '#10B981'
  const data = series.map((p) => ({ month: p.month, value: Math.round(p.value / 100) })) // rupees for axis
  const targetRupees = Math.round(target / 100)
  // Ensure the target line is always on-chart, even when projection falls far short of it.
  const maxProjected = data.length ? Math.max(...data.map((d) => d.value)) : 0
  const yMax = Math.ceil(Math.max(maxProjected, targetRupees) * 1.08)

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Projected corpus vs target</h3>
          <p className="text-xs text-zinc-600 mt-0.5">Compound growth of your current plan</p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 text-zinc-400">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} /> Projected
          </span>
          <span className="flex items-center gap-1.5 text-zinc-400">
            <span className="inline-block w-3 border-t-2 border-dashed border-zinc-500" /> Target
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gProj" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.28} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: '#52525b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(m: number) => (m % 12 === 0 ? `${m / 12}y` : '')}
          />
          <YAxis
            domain={[0, yMax]}
            tick={{ fill: '#52525b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v: number) => formatCompact(v * 100)}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={targetRupees}
            stroke="#a1a1aa"
            strokeDasharray="5 4"
            label={{ value: 'Target', position: 'insideTopRight', fill: '#a1a1aa', fontSize: 10 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            name="Projected"
            stroke={color}
            fill="url(#gProj)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
