'use client'
import { motion } from 'framer-motion'
import { CheckCircle, AlertTriangle, Info, Lightbulb, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import type { Insight } from '@/lib/engines/insight-engine'

const SEVERITY_STYLES = {
  success: { icon: CheckCircle,   bg: 'bg-emerald-950/30 border-emerald-800/30', icon_cls: 'text-emerald-400', label: 'bg-emerald-500/10 text-emerald-400' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-950/20 border-amber-800/30',    icon_cls: 'text-amber-400',   label: 'bg-amber-500/10 text-amber-400' },
  info:    { icon: Info,          bg: 'bg-blue-950/20 border-blue-800/30',       icon_cls: 'text-blue-400',    label: 'bg-blue-500/10 text-blue-400' },
  tip:     { icon: Lightbulb,     bg: 'bg-zinc-800/60 border-zinc-700/40',       icon_cls: 'text-zinc-400',    label: 'bg-zinc-700/50 text-zinc-400' },
}

export function InsightCard({ insight, index = 0 }: { insight: Insight; index?: number }) {
  const router = useRouter()
  const style = SEVERITY_STYLES[insight.severity]
  const Icon = style.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className={cn('rounded-xl border p-3.5', style.bg)}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', style.icon_cls)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200 leading-snug">{insight.title}</p>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{insight.body}</p>
          {insight.actionLabel && insight.actionHref && (
            <button
              onClick={() => router.push(insight.actionHref! as any)}
              className={cn('flex items-center gap-1 text-xs mt-2 font-medium', style.icon_cls)}
            >
              {insight.actionLabel} <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
