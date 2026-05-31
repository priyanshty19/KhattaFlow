import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

/**
 * myFinGrid brand logo — a single source of truth for the wordmark + mark.
 *
 * Mark concept ("Forward Leaf"): a purple→blue forward triangle (play /
 * momentum) paired with a green→teal growth flame, offset on a rising
 * diagonal — plan & invest moving forward, growth lifting up. No dollar/
 * rupee/coin clichés, in the spirit of Linear / Ramp / Mercury marks.
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

/** The mark only — the Forward-Leaf dual shape on a transparent ground. */
export function LogoMark({ size = 'md', className }: { size?: LogoSize; className?: string }) {
  const px = MARK_PX[size]
  return (
    <svg
      width={px}
      height={px}
      viewBox="219 135 680 680"
      fill="none"
      role="img"
      aria-label="myFinGrid"
      className={cn('shrink-0', className)}
    >
      {/* Forward triangle (play / momentum), tilted up-right */}
      <g transform="rotate(-9 470 560)">
        <path
          d="M330 390 L330 730 L600 560 Z"
          fill="#ffffff"
          stroke="#ffffff"
          strokeWidth="58"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </g>
      {/* Growth flame (leaf / ascent), upper-right */}
      <path
        d="M724 182 C832 286 820 416 662 476 C654 384 646 276 724 182 Z"
        fill="#ffffff"
        stroke="#ffffff"
        strokeWidth="20"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
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
