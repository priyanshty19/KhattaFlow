'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  ArrowRight, BarChart3, Target, Wallet, TrendingUp,
  CalendarRange, FileUp, ShieldCheck, Sparkles, ChevronDown,
  IndianRupee, PieChart as PieIcon, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const SIGN_IN = '/sign-in' as any
const SIGN_UP = '/sign-up' as any

/* ─── chart data ──────────────────────────────────────────────── */
const AREA_DATA = [
  { month: 'Dec', income: 95000, expenses: 42000, savings: 48000 },
  { month: 'Jan', income: 1_00_000, expenses: 45000, savings: 50000 },
  { month: 'Feb', income: 1_00_000, expenses: 38000, savings: 55000 },
  { month: 'Mar', income: 1_05_000, expenses: 51000, savings: 47000 },
  { month: 'Apr', income: 1_05_000, expenses: 44000, savings: 58000 },
  { month: 'May', income: 1_08_500, expenses: 38630, savings: 68870 },
]

const PIE_DATA = [
  { name: 'Debt / EMI', value: 35, color: '#ef4444' },
  { name: 'Savings', value: 28, color: '#10b981' },
  { name: 'Investments', value: 22, color: '#3b82f6' },
  { name: 'Living', value: 15, color: '#f97316' },
]

/* ─── animated counter ──────────────────────────────────────────── */
function Counter({ to, prefix = '', suffix = '', duration = 1800 }: {
  to: number; prefix?: string; suffix?: string; duration?: number
}) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const start = performance.now()
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1)
        setVal(Math.round((1 - Math.pow(1 - p, 3)) * to))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.3 })
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [to, duration])
  return <span ref={ref}>{prefix}{val.toLocaleString('en-IN')}{suffix}</span>
}

/* ─── fade-in on scroll ─────────────────────────────────────────── */
function FadeIn({ children, delay = 0, className = '', dir = 'up' }: {
  children: React.ReactNode; delay?: number; className?: string; dir?: 'up' | 'left' | 'right'
}) {
  const [vis, setVis] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); io.disconnect() }
    }, { threshold: 0.12 })
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  const hidden = dir === 'up' ? 'translate-y-8' : dir === 'left' ? '-translate-x-8' : 'translate-x-8'
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn('transition-all duration-700', vis ? 'opacity-100 translate-y-0 translate-x-0' : `opacity-0 ${hidden}`, className)}
    >
      {children}
    </div>
  )
}

/* ─── mock budget bar ────────────────────────────────────────────── */
function MockBar({ label, pct, color, amount }: { label: string; pct: number; color: string; amount: string }) {
  const [w, setW] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setTimeout(() => setW(pct), 150); io.disconnect() }
    }, { threshold: 0.3 })
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [pct])
  return (
    <div ref={ref} className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-300 font-medium tabular-nums">{amount}</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${w}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

/* ─── custom tooltip ─────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-900 border border-zinc-700/60 rounded-xl px-3 py-2.5 text-xs shadow-xl">
      <p className="text-zinc-500 mb-1.5 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-zinc-400">{p.name}</span>
          <span className="text-zinc-200 font-semibold tabular-nums ml-1">
            ₹{Number(p.value).toLocaleString('en-IN')}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ─── main ───────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace('/')
  }, [isLoaded, isSignedIn, router])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-48 -right-48 w-[700px] h-[700px] rounded-full bg-emerald-500/6 blur-3xl" />
        <div className="absolute top-1/2 -left-64 w-[500px] h-[500px] rounded-full bg-emerald-600/4 blur-3xl" />
        <div className="absolute -bottom-32 right-1/3 w-[400px] h-[400px] rounded-full bg-emerald-400/3 blur-3xl" />
      </div>

      {/* ── nav ── */}
      <nav className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled ? 'bg-background/80 backdrop-blur-xl border-b border-zinc-800/60' : 'bg-transparent'
      )}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-sm font-bold text-zinc-100 tracking-tight">KhattaFlow</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href={SIGN_IN} className="text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors px-2 sm:px-3 py-2">
              Sign in
            </Link>
            <Link href={SIGN_UP} className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-3 sm:px-4 py-2 rounded-lg transition-all hover:shadow-lg hover:shadow-emerald-500/20">
              Get started <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-8">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">Smart personal finance for India</span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-zinc-100 tracking-tight leading-[1.1] max-w-3xl mb-6">
          Know exactly where{' '}
          <span className="bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">every rupee</span>
          {' '}goes
        </h1>

        <p className="text-sm sm:text-base text-zinc-500 max-w-xl mb-10 leading-relaxed">
          Track spending, plan budgets 6 months ahead, and see your savings rate improve — all in one clean dashboard built for India.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mb-16 sm:mb-20 w-full sm:w-auto">
          <Link href={SIGN_UP} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm px-6 py-3 rounded-xl transition-all hover:shadow-xl hover:shadow-emerald-500/25 hover:-translate-y-0.5">
            Start for free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href={SIGN_IN} className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 border border-zinc-700/60 hover:border-zinc-600 px-6 py-3 rounded-xl transition-all">
            Sign in to your account
          </Link>
        </div>

        {/* hero stats — 4 clear pillars */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10 max-w-2xl mx-auto w-full">
          {[
            { to: 4, suffix: ' types', label: 'Debt · Savings · Investments · Income', color: 'text-red-400' },
            { to: 63, suffix: '%', label: 'Average savings rate tracked', color: 'text-emerald-400' },
            { to: 6, suffix: ' months', label: 'Forward budget planning', color: 'text-blue-400' },
            { to: 0, suffix: ' hidden fees', label: 'Free forever, no card needed', color: 'text-zinc-300' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className={cn('text-2xl sm:text-3xl font-bold tabular-nums', s.color)}>
                <Counter to={s.to} suffix={s.suffix} />
              </div>
              <div className="text-[10px] sm:text-xs text-zinc-600 mt-1 leading-snug">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-zinc-700">
          <ChevronDown className="w-5 h-5" />
        </div>
      </section>

      {/* ── budget dashboard preview ── */}
      <section className="px-4 sm:px-6 py-16 sm:py-24 max-w-5xl mx-auto">
        <FadeIn>
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 backdrop-blur-sm p-5 sm:p-8 shadow-2xl shadow-black/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
              <div>
                <p className="text-xs text-zinc-600 mb-1">May 2026</p>
                <h2 className="text-sm font-semibold text-zinc-200">Budget Overview</h2>
              </div>
              <div className="flex gap-4 sm:gap-6">
                {[
                  { label: 'Income', val: '₹1,08,500', color: 'text-emerald-400' },
                  { label: 'Spent', val: '₹38,630', color: 'text-red-400' },
                  { label: 'Saved', val: '₹68,870', color: 'text-blue-400' },
                ].map(s => (
                  <div key={s.label}>
                    <p className="text-[10px] text-zinc-600">{s.label}</p>
                    <p className={cn('text-xs font-semibold tabular-nums', s.color)}>{s.val}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-10 gap-y-4">
              <MockBar label="Home Loan EMI" pct={100} color="#ef4444" amount="₹25,000" />
              <MockBar label="Mutual Funds" pct={100} color="#3b82f6" amount="₹20,000" />
              <MockBar label="Recurring Deposit" pct={100} color="#8b5cf6" amount="₹6,000" />
              <MockBar label="Entertainment" pct={85} color="#f97316" amount="₹5,480" />
              <MockBar label="Transport" pct={72} color="#10b981" amount="₹3,600" />
              <MockBar label="Shopping" pct={60} color="#06b6d4" amount="₹3,000" />
            </div>
            <div className="mt-6 flex items-center justify-between px-4 py-3 bg-emerald-500/8 border border-emerald-500/20 rounded-xl">
              <span className="text-xs text-zinc-500">Net balance this month</span>
              <span className="text-sm font-bold text-emerald-400 tabular-nums">₹1,000 remaining</span>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── analytics preview ── */}
      <section className="px-4 sm:px-6 py-16 sm:py-24 max-w-6xl mx-auto">
        <FadeIn className="text-center mb-12">
          <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-3">Analytics</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight">See your money tell a story</h2>
          <p className="text-sm text-zinc-500 mt-3 max-w-md mx-auto">6-month trend lines and spending breakdowns — always visible at a glance.</p>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-5">
          {/* area chart — takes 2 cols */}
          <FadeIn delay={0} className="md:col-span-2">
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-5 sm:p-6 h-full">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs font-semibold text-zinc-200">Income vs Expenses vs Savings</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">Last 6 months</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Income</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Expenses</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Savings</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={AREA_DATA} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4ade80" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f87171" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gSav" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#52525b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#52525b' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="income" name="Income" stroke="#4ade80" strokeWidth={1.5} fill="url(#gIncome)" dot={false} activeDot={{ r: 4, fill: '#4ade80' }} />
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f87171" strokeWidth={1.5} fill="url(#gExp)" dot={false} activeDot={{ r: 4, fill: '#f87171' }} />
                  <Area type="monotone" dataKey="savings" name="Savings" stroke="#60a5fa" strokeWidth={1.5} fill="url(#gSav)" dot={false} activeDot={{ r: 4, fill: '#60a5fa' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </FadeIn>

          {/* pie chart */}
          <FadeIn delay={120}>
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-5 sm:p-6 flex flex-col">
              <div className="mb-4">
                <p className="text-xs font-semibold text-zinc-200">Spending Breakdown</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">By category type</p>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                      {PIE_DATA.map((d, i) => (
                        <Cell key={i} fill={d.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => active && payload?.length ? (
                        <div className="bg-zinc-900 border border-zinc-700/60 rounded-lg px-3 py-2 text-xs">
                          <span style={{ color: payload[0].payload.color }}>{payload[0].name}</span>
                          <span className="text-zinc-200 ml-2 font-semibold">{payload[0].value}%</span>
                        </div>
                      ) : null}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                {PIE_DATA.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-[10px] text-zinc-500 truncate">{d.name}</span>
                    <span className="text-[10px] font-semibold text-zinc-300 ml-auto">{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── features ── */}
      <section className="px-4 sm:px-6 py-16 sm:py-24 max-w-6xl mx-auto">
        <FadeIn className="text-center mb-12">
          <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-3">Everything you need</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight">Built for the way Indians manage money</h2>
          <p className="text-sm text-zinc-500 mt-3 max-w-lg mx-auto">EMIs, mutual funds, recurring deposits, salary — every financial pattern is a first-class citizen.</p>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Target, title: 'Smart Budgets', desc: 'Monthly limits per category with visual health indicators.', color: 'bg-red-500/10 text-red-400', delay: 0 },
            { icon: CalendarRange, title: '6-Month Planner', desc: 'Spreadsheet grid to plan budgets months ahead in one session.', color: 'bg-blue-500/10 text-blue-400', delay: 60 },
            { icon: BarChart3, title: 'Trend Analytics', desc: 'Income vs spend vs savings charts over 6-month rolling windows.', color: 'bg-purple-500/10 text-purple-400', delay: 120 },
            { icon: TrendingUp, title: 'Investments', desc: 'Mutual funds, SIPs and recurring deposits tracked separately.', color: 'bg-emerald-500/10 text-emerald-400', delay: 180 },
            { icon: FileUp, title: 'CSV Import', desc: 'Upload your bank statement and map categories in seconds.', color: 'bg-amber-500/10 text-amber-400', delay: 0 },
            { icon: Wallet, title: '4 Category Types', desc: 'Debt · Savings · Investments · Income — each tracked differently.', color: 'bg-cyan-500/10 text-cyan-400', delay: 60 },
            { icon: PieIcon, title: 'Savings Goal', desc: 'Set a % target. See if you hit it each month at a glance.', color: 'bg-pink-500/10 text-pink-400', delay: 120 },
            { icon: Zap, title: 'AI Insights', desc: 'Spending patterns and anomalies surfaced automatically.', color: 'bg-yellow-500/10 text-yellow-400', delay: 180 },
          ].map(f => (
            <FadeIn key={f.title} delay={f.delay}>
              <div className="group relative h-full p-5 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 hover:border-emerald-500/30 hover:bg-zinc-900/80 hover:-translate-y-1 transition-all duration-300">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', f.color)}>
                  <f.icon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-100 mb-1.5">{f.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── how it works ── */}
      <section className="px-4 sm:px-6 py-16 sm:py-24 max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          <FadeIn dir="left">
            <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-4">How it works</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight mb-10">Up and running in 5 minutes</h2>
            {[
              { n: 1, title: 'Set up your categories', desc: 'Pick from 16 built-in categories across debt, savings, investments and income.' },
              { n: 2, title: 'Log or import transactions', desc: 'Add manually or bulk-import from a CSV bank statement export.' },
              { n: 3, title: 'Plan your budgets', desc: 'Set monthly limits — or plan 6 months at once with the Planner grid.', last: true },
            ].map(s => (
              <div key={s.n} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-emerald-400">{s.n}</span>
                  </div>
                  {!s.last && <div className="w-px flex-1 mt-3 mb-1 bg-gradient-to-b from-emerald-500/20 to-transparent" />}
                </div>
                <div className="pb-8">
                  <p className="text-sm font-semibold text-zinc-100 mb-1">{s.title}</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </FadeIn>

          {/* planner mockup */}
          <FadeIn dir="right" delay={100}>
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-zinc-300">Budget Planner</span>
                <span className="text-[10px] text-zinc-600">6-month view</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-[10px] text-zinc-600 font-medium px-1 mb-1">
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
                    <div key={i} className="bg-zinc-800/80 border border-zinc-700/50 rounded-md px-1.5 py-1.5 text-[10px] text-zinc-300 text-center tabular-nums">₹{v}</div>
                  ))}
                </div>
              ))}
              <div className="pt-1">
                <div className="w-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[10px] font-semibold py-1.5 rounded-lg text-center">
                  Save All Changes
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── numbers strip ── */}
      <section className="px-4 sm:px-6 py-16 border-y border-zinc-800/40">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { to: 4, suffix: '', label: 'Financial category types' },
            { to: 6, suffix: '', label: 'Months of planning ahead' },
            { to: 100, suffix: '%', label: 'Your data stays private' },
            { to: 0, suffix: '', label: 'Hidden fees, ever' },
          ].map((s, i) => (
            <div key={i}>
              <div className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-1 tabular-nums">
                <Counter to={s.to} suffix={s.suffix} />
              </div>
              <div className="text-xs text-zinc-600">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── final cta ── */}
      <section className="px-4 sm:px-6 py-24 sm:py-32 text-center">
        <FadeIn className="max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-8">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight mb-4">
            Your finances, finally under control
          </h2>
          <p className="text-sm text-zinc-500 mb-10 leading-relaxed">
            Stop wondering where your money went. Set up in 5 minutes, see clarity immediately.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
            <Link href={SIGN_UP} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm px-8 py-3.5 rounded-xl transition-all hover:shadow-xl hover:shadow-emerald-500/25 hover:-translate-y-0.5">
              Create free account <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <p className="text-xs text-zinc-700 mt-5">No credit card required · Free forever</p>
        </FadeIn>
      </section>

      {/* ── footer ── */}
      <footer className="border-t border-zinc-800/40 px-4 sm:px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
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
