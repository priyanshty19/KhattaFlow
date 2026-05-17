'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight, BarChart3, Target, Wallet, TrendingUp,
  CalendarRange, FileUp, ShieldCheck, Sparkles, ChevronDown,
  IndianRupee, PieChart, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

/* ─── animated counter ─────────────────────────────────────── */
function Counter({ to, prefix = '', suffix = '', duration = 1800 }: {
  to: number; prefix?: string; suffix?: string; duration?: number
}) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      observer.disconnect()
      const start = performance.now()
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1)
        const ease = 1 - Math.pow(1 - p, 3)
        setVal(Math.round(ease * to))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.3 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [to, duration])
  return <span ref={ref}>{prefix}{val.toLocaleString('en-IN')}{suffix}</span>
}

/* ─── feature card ──────────────────────────────────────────── */
function FeatureCard({ icon: Icon, title, desc, color, delay }: {
  icon: any; title: string; desc: string; color: string; delay: number
}) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); observer.disconnect() }
    }, { threshold: 0.15 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        'group relative p-6 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 backdrop-blur-sm transition-all duration-700',
        'hover:border-emerald-500/30 hover:bg-zinc-900/80 hover:-translate-y-1',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      )}
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-100 mb-2">{title}</h3>
      <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}

/* ─── step ──────────────────────────────────────────────────── */
function Step({ n, title, desc, last }: { n: number; title: string; desc: string; last?: boolean }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); observer.disconnect() }
    }, { threshold: 0.2 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={ref} className={cn('flex gap-5 transition-all duration-700', visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6')}>
      <div className="flex flex-col items-center">
        <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-emerald-400">{n}</span>
        </div>
        {!last && <div className="w-px flex-1 mt-3 bg-gradient-to-b from-emerald-500/20 to-transparent" />}
      </div>
      <div className="pb-10">
        <p className="text-sm font-semibold text-zinc-100 mb-1">{title}</p>
        <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

/* ─── mock budget bar ───────────────────────────────────────── */
function MockBar({ label, pct, color, amount }: { label: string; pct: number; color: string; amount: string }) {
  const [width, setWidth] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setTimeout(() => setWidth(pct), 200); observer.disconnect() }
    }, { threshold: 0.3 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [pct])
  return (
    <div ref={ref} className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-300 font-medium tabular-nums">{amount}</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

/* ─── main page ─────────────────────────────────────────────── */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute top-1/2 -left-60 w-[500px] h-[500px] rounded-full bg-emerald-600/4 blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-[400px] h-[400px] rounded-full bg-emerald-400/3 blur-3xl" />
      </div>

      {/* ── nav ── */}
      <nav className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled ? 'bg-background/80 backdrop-blur-xl border-b border-zinc-800/60' : 'bg-transparent'
      )}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-sm font-bold text-zinc-100 tracking-tight">KhattaFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors px-3 py-2"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-4 py-2 rounded-lg transition-all hover:shadow-lg hover:shadow-emerald-500/20"
            >
              Get started <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-8 animate-fade-in">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">Smart personal finance for India</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold text-zinc-100 tracking-tight leading-[1.1] max-w-3xl mb-6">
          Know exactly where{' '}
          <span className="bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">
            every rupee
          </span>{' '}
          goes
        </h1>

        <p className="text-base text-zinc-500 max-w-xl mb-10 leading-relaxed">
          KhattaFlow gives you a clear picture of your spending, savings, and investments — with smart budgets, multi-month planning, and insights that actually make sense.
        </p>

        <div className="flex items-center gap-3 flex-wrap justify-center mb-20">
          <Link
            href="/sign-up"
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm px-6 py-3 rounded-xl transition-all hover:shadow-xl hover:shadow-emerald-500/25 hover:-translate-y-0.5"
          >
            Start for free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/sign-in"
            className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 border border-zinc-700/60 hover:border-zinc-600 px-6 py-3 rounded-xl transition-all"
          >
            Sign in to your account
          </Link>
        </div>

        {/* hero stats */}
        <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto">
          {[
            { to: 50000, prefix: '₹', suffix: '+', label: 'tracked per user' },
            { to: 16, suffix: ' categories', label: 'built-in' },
            { to: 6, suffix: ' months', label: 'forward planning' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl font-bold text-zinc-100 tabular-nums">
                <Counter to={s.to} prefix={s.prefix ?? ''} suffix={s.suffix} />
              </div>
              <div className="text-xs text-zinc-600 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-zinc-700">
          <ChevronDown className="w-5 h-5" />
        </div>
      </section>

      {/* ── dashboard preview ── */}
      <section className="relative px-6 py-24 max-w-5xl mx-auto">
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 backdrop-blur-sm p-6 md:p-8 shadow-2xl shadow-black/40">
          {/* mock top bar */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-xs text-zinc-600 mb-1">May 2026</p>
              <h2 className="text-sm font-semibold text-zinc-200">Budget Overview</h2>
            </div>
            <div className="flex gap-3">
              {[
                { label: 'Income', val: '₹1,08,500', color: 'text-emerald-400' },
                { label: 'Spent', val: '₹38,630', color: 'text-red-400' },
                { label: 'Saved', val: '₹68,870', color: 'text-blue-400' },
              ].map(s => (
                <div key={s.label} className="text-right hidden sm:block">
                  <p className="text-[10px] text-zinc-600">{s.label}</p>
                  <p className={cn('text-xs font-semibold tabular-nums', s.color)}>{s.val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* mock bars */}
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-4">
            <MockBar label="Home Loan EMI" pct={100} color="#ef4444" amount="₹25,000" />
            <MockBar label="Mutual Funds" pct={100} color="#3b82f6" amount="₹20,000" />
            <MockBar label="Recurring Deposit" pct={100} color="#8b5cf6" amount="₹6,000" />
            <MockBar label="Entertainment" pct={85} color="#f97316" amount="₹5,480" />
            <MockBar label="Transport" pct={72} color="#10b981" amount="₹3,600" />
            <MockBar label="Shopping" pct={60} color="#06b6d4" amount="₹3,000" />
          </div>

          {/* net balance pill */}
          <div className="mt-8 flex items-center justify-between px-4 py-3 bg-emerald-500/8 border border-emerald-500/20 rounded-xl">
            <span className="text-xs text-zinc-500">Net balance this month</span>
            <span className="text-sm font-bold text-emerald-400 tabular-nums">₹1,000 remaining</span>
          </div>
        </div>
      </section>

      {/* ── features ── */}
      <section className="px-6 py-24 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-3">Everything you need</p>
          <h2 className="text-3xl font-bold text-zinc-100 tracking-tight">Built for the way Indians manage money</h2>
          <p className="text-sm text-zinc-500 mt-4 max-w-lg mx-auto">From EMIs to mutual funds — every financial pattern you have is a first-class citizen in KhattaFlow.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Target, title: 'Smart Budgets', desc: 'Set monthly limits per category. Get alerted when you\'re near the edge.', color: 'bg-red-500/10 text-red-400', delay: 0 },
            { icon: CalendarRange, title: '6-Month Planner', desc: 'Plan budgets across 6 months in a spreadsheet-style grid. Fill rows in one click.', color: 'bg-blue-500/10 text-blue-400', delay: 80 },
            { icon: BarChart3, title: 'Analytics', desc: 'Trend charts, category breakdowns and savings rate history — all in one place.', color: 'bg-purple-500/10 text-purple-400', delay: 160 },
            { icon: TrendingUp, title: 'Investments', desc: 'Track mutual funds, recurring deposits and other investment categories separately.', color: 'bg-emerald-500/10 text-emerald-400', delay: 240 },
            { icon: FileUp, title: 'CSV Import', desc: 'Paste or upload your bank statement. We\'ll map categories automatically.', color: 'bg-amber-500/10 text-amber-400', delay: 0 },
            { icon: Wallet, title: 'Multi-type Categories', desc: 'Debt, Savings, Investments and Income — each with their own tracking logic.', color: 'bg-cyan-500/10 text-cyan-400', delay: 80 },
            { icon: PieChart, title: 'Savings Goal', desc: 'Set a target savings rate. See how close you are at a glance every month.', color: 'bg-pink-500/10 text-pink-400', delay: 160 },
            { icon: Zap, title: 'Instant Insights', desc: 'AI-powered spending insights surface patterns you didn\'t know existed.', color: 'bg-yellow-500/10 text-yellow-400', delay: 240 },
          ].map(f => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* ── how it works ── */}
      <section className="px-6 py-24 max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-4">How it works</p>
            <h2 className="text-3xl font-bold text-zinc-100 tracking-tight mb-10">Up and running in minutes</h2>
            <div>
              <Step n={1} title="Set up your categories" desc="Pick from 16 built-in categories across debt, savings, investments and income. Add your own anytime." />
              <Step n={2} title="Log or import transactions" desc="Add transactions manually or bulk-import from a CSV bank statement export." />
              <Step n={3} title="Set monthly budgets" desc="Assign spending limits per category. Use the Planner to set budgets for the next 6 months at once." last />
            </div>
          </div>

          {/* planner mockup */}
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-5 space-y-3">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-zinc-300">Budget Planner</span>
              <span className="text-[10px] text-zinc-600">6-month view</span>
            </div>
            {/* header row */}
            <div className="grid grid-cols-4 gap-2 text-[10px] text-zinc-600 font-medium px-1">
              <span>Category</span>
              <span className="text-center">May</span>
              <span className="text-center">Jun</span>
              <span className="text-center">Jul</span>
            </div>
            {[
              { name: 'Food & Dining', vals: ['12,000', '12,000', '12,000'], color: '#ef4444' },
              { name: 'Transport', vals: ['4,000', '4,000', '5,000'], color: '#f97316' },
              { name: 'Mutual Funds', vals: ['20,000', '20,000', '20,000'], color: '#3b82f6' },
              { name: 'Savings Goal', vals: ['10,000', '10,000', '12,000'], color: '#10b981' },
            ].map(row => (
              <div key={row.name} className="grid grid-cols-4 gap-2 items-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                  <span className="text-[10px] text-zinc-400 truncate">{row.name}</span>
                </div>
                {row.vals.map((v, i) => (
                  <div key={i} className="bg-zinc-800/80 border border-zinc-700/50 rounded-md px-2 py-1.5 text-[10px] text-zinc-300 text-center tabular-nums">
                    ₹{v}
                  </div>
                ))}
              </div>
            ))}
            <div className="pt-2">
              <div className="w-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[10px] font-semibold py-1.5 rounded-lg text-center">
                Save All Changes
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── social proof numbers ── */}
      <section className="px-6 py-24 border-y border-zinc-800/40">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { to: 16, suffix: '', label: 'Category types' },
            { to: 6, suffix: '', label: 'Months of planning' },
            { to: 100, suffix: '%', label: 'Private — your data only' },
            { to: 0, suffix: ' fees', label: 'Hidden charges' },
          ].map((s, i) => (
            <div key={i}>
              <div className="text-3xl font-bold text-zinc-100 mb-1 tabular-nums">
                <Counter to={s.to} suffix={s.suffix} />
              </div>
              <div className="text-xs text-zinc-600">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── final cta ── */}
      <section className="px-6 py-32 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-8">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold text-zinc-100 tracking-tight mb-4">
            Your finances, finally under control
          </h2>
          <p className="text-sm text-zinc-500 mb-10 leading-relaxed">
            Join KhattaFlow and stop wondering where your money went. It takes less than 5 minutes to set up.
          </p>
          <div className="flex items-center gap-3 justify-center">
            <Link
              href="/sign-up"
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm px-8 py-3.5 rounded-xl transition-all hover:shadow-xl hover:shadow-emerald-500/25 hover:-translate-y-0.5"
            >
              Create free account <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <p className="text-xs text-zinc-700 mt-6">No credit card required · Free forever</p>
        </div>
      </section>

      {/* ── footer ── */}
      <footer className="border-t border-zinc-800/40 px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
              <IndianRupee className="w-3 h-3 text-emerald-400" />
            </div>
            <span className="text-xs font-semibold text-zinc-500">KhattaFlow</span>
          </div>
          <p className="text-xs text-zinc-700">Personal finance, simplified.</p>
        </div>
      </footer>

    </div>
  )
}
