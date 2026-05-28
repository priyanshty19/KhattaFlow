import { cn } from '@/lib/utils/cn'
import { formatINR, formatCompact } from '@/lib/utils/currency'

interface CurrencyDisplayProps {
  amount: number        // paise
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  colorCoded?: boolean  // green if positive, red if negative
  showSign?: boolean
  compact?: boolean
  className?: string
  muted?: boolean
}

const SIZE_CLASSES = {
  xs:  'text-xs',
  sm:  'text-sm',
  md:  'text-base',
  lg:  'text-lg font-semibold',
  xl:  'text-2xl font-bold',
  '2xl': 'text-4xl font-bold',
}

export function CurrencyDisplay({
  amount,
  size = 'md',
  colorCoded = false,
  showSign = false,
  compact = false,
  className,
  muted = false,
}: CurrencyDisplayProps) {
  const isPositive = amount >= 0
  const display = compact ? formatCompact(Math.abs(amount)) : formatINR(Math.abs(amount))
  const sign = showSign ? (isPositive ? '+' : '−') : amount < 0 ? '−' : ''

  return (
    <span
      data-amount
      className={cn(
        SIZE_CLASSES[size],
        'font-variant-numeric tabular-nums',
        colorCoded && isPositive && 'text-emerald-400',
        colorCoded && !isPositive && 'text-red-400',
        !colorCoded && !muted && 'text-zinc-100',
        muted && 'text-zinc-400',
        className
      )}
    >
      {sign}{display}
    </span>
  )
}
