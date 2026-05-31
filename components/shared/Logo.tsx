import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

/**
 * myFinGrid brand logo — a single source of truth for the wordmark + mark.
 *
 * Mark concept ("M·F·G monogram"): one continuous gesture in which the rising
 * twin peaks read as **M** (my + momentum), the crossbar arm as **F**, and the
 * hooked right terminal as **G**. Wealth-building motion without dollar/rupee/
 * coin clichés, in the spirit of Linear / Ramp / Mercury marks.
 *
 * Wordmark is two-tone: a muted "my" (personal ownership) + a solid "FinGrid".
 */

type LogoSize = 'sm' | 'md' | 'lg'

const MARK_PX: Record<LogoSize, number> = { sm: 22, md: 28, lg: 36 }
const TEXT_CLS: Record<LogoSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
}

/** The mark only — a rounded emerald tile with the M·F·G monogram. */
export function LogoMark({ size = 'md', className }: { size?: LogoSize; className?: string }) {
  const px = MARK_PX[size]
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="myFinGrid"
      className={cn('shrink-0', className)}
    >
      <defs>
        <linearGradient id="mfg-tile" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>

      {/* Rounded tile */}
      <rect width="32" height="32" rx="8.5" fill="url(#mfg-tile)" />

      {/* Monogram: M rising peaks + G hooked terminal */}
      <g
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M10 24 L10 10 L16 17 L22 10" />
        <path d="M22 10 L22 21.5 L17 21.5" />
      </g>
      {/* F: crossbar arm on the left stem */}
      <rect x="10" y="14.7" width="6.4" height="2.3" rx="1.15" fill="#ffffff" />
    </svg>
  )
}

/** The two-tone wordmark text only. */
export function LogoWordmark({ size = 'md', className }: { size?: LogoSize; className?: string }) {
  return (
    <span className={cn('font-semibold tracking-tight', TEXT_CLS[size], className)}>
      <span className="text-zinc-400">my</span>
      <span className="text-zinc-100">FinGrid</span>
    </span>
  )
}

/**
 * Full lockup (mark + wordmark). Wrap in a link by default to "/".
 * Pass `href={null}` to render a non-interactive lockup.
 */
export function Logo({
  size = 'md',
  href = '/',
  showWordmark = true,
  className,
}: {
  size?: LogoSize
  href?: string | null
  showWordmark?: boolean
  className?: string
}) {
  const inner = (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      {showWordmark && <LogoWordmark size={size} />}
    </span>
  )

  if (href === null) return inner
  return (
    <Link href={href as any} className="inline-flex items-center" aria-label="myFinGrid home">
      {inner}
    </Link>
  )
}
