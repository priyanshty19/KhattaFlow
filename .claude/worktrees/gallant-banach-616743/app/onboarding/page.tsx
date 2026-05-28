'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '@clerk/nextjs'
import {
  Wallet, ChevronRight, Check, IndianRupee,
  Briefcase, GraduationCap, Building2, Laptop2,
  TrendingDown, BarChart2, TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import {
  buildDefaultCategories,
  FIXED_COMMITMENT_OPTIONS,
  type ProfileType,
  type InvestmentStyle,
  type CategoryTemplate,
} from '@/constants/categories'

const STEPS = ['welcome', 'profile', 'income', 'commitments', 'goal', 'investment', 'preview', 'setup', 'done'] as const
type Step = typeof STEPS[number]

const PROFILE_OPTIONS: { id: ProfileType; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'salaried',   label: 'Salaried',   desc: 'Regular monthly paycheck',        icon: Briefcase  },
  { id: 'freelancer', label: 'Freelancer', desc: 'Variable / project-based income',  icon: Laptop2    },
  { id: 'student',    label: 'Student',    desc: 'Stipend, pocket money or part-time', icon: GraduationCap },
  { id: 'business',   label: 'Business',   desc: 'Own business or self-employed',    icon: Building2  },
]

const INVESTMENT_OPTIONS: { id: InvestmentStyle; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'conservative', label: 'Conservative', desc: 'FD, PPF, Govt Bonds — low risk, steady returns',      icon: TrendingDown },
  { id: 'balanced',     label: 'Balanced',     desc: 'Mix of mutual funds, PPF and emergency fund',         icon: BarChart2    },
  { id: 'aggressive',   label: 'Aggressive',   desc: 'Stocks, crypto, mutual funds — higher risk & reward', icon: TrendingUp   },
]

const TYPE_COLORS: Record<string, string> = {
  income: 'text-emerald-400',
  expense: 'text-red-400',
  investment: 'text-blue-400',
  savings: 'text-purple-400',
}
const TYPE_BG: Record<string, string> = {
  income: 'bg-emerald-500/10',
  expense: 'bg-red-500/10',
  investment: 'bg-blue-500/10',
  savings: 'bg-purple-500/10',
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useUser()

  const [step, setStep] = useState<Step>('welcome')
  const [profile, setProfile] = useState<ProfileType>('salaried')
  const [incomeName, setIncomeName] = useState('')
  const [salary, setSalary] = useState('')
  const [commitments, setCommitments] = useState<string[]>([])
  const [savingsGoal, setSavingsGoal] = useState(20)
  const [investmentStyle, setInvestmentStyle] = useState<InvestmentStyle>('balanced')
  // Track by NAME (stable) not slug (has timestamp — changes when profile/incomeName change)
  const [deselectedNames, setDeselectedNames] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const stepIndex = STEPS.indexOf(step)

  const categories = useMemo(() =>
    buildDefaultCategories(profile, incomeName, commitments, investmentStyle),
    [profile, incomeName, commitments, investmentStyle]
  )

  // Which slugs are currently "active" — all slugs except those whose name is deselected
  const activeSlugs: Set<string> = useMemo(() => {
    return new Set(categories.filter(c => !deselectedNames.has(c.name)).map(c => c.slug))
  }, [categories, deselectedNames])

  const toggleSlug = (slug: string) => {
    const cat = categories.find(c => c.slug === slug)
    if (!cat) return
    const next = new Set(deselectedNames)
    if (next.has(cat.name)) next.delete(cat.name)
    else next.add(cat.name)
    setDeselectedNames(next)
  }

  const toggleCommitment = (id: string) => {
    setCommitments(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
    // Commitment changes add/remove entire category groups — reset deselections
    setDeselectedNames(new Set())
  }

  const handleFinish = async () => {
    setStep('setup')
    setLoading(true)
    try {
      // Filter by name (stable) — immune to slug timestamp changes from navigation
      const selected: CategoryTemplate[] = categories.filter(c => !deselectedNames.has(c.name))
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salary: salary ? parseFloat(salary) : undefined,
          savingsGoalPct: savingsGoal / 100,
          categories: selected,
          companyName: incomeName || null,
          investmentStyle,
        }),
      })
      setStep('done')
      setTimeout(() => router.push('/'), 2000)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const goTo = (s: Step) => setStep(s)

  const slideVariants = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -16 },
  }

  const groupedCategories = useMemo(() => {
    const groups: Record<string, CategoryTemplate[]> = {}
    for (const c of categories) {
      const key = c.group ?? c.type
      if (!groups[key]) groups[key] = []
      groups[key].push(c)
    }
    return groups
  }, [categories])

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-12">
      {/* Progress bar */}
      {step !== 'done' && step !== 'setup' && (
        <div className="flex items-center gap-1.5 mb-12">
          {STEPS.filter(s => s !== 'setup' && s !== 'done').map((s, i) => {
            const si = STEPS.indexOf(s)
            return (
              <div
                key={s}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  si <= stepIndex ? 'bg-emerald-500 w-6' : 'bg-zinc-800 w-2'
                )}
              />
            )
          })}
        </div>
      )}

      <AnimatePresence mode="wait">

        {/* ── Welcome ─────────────────────────────────────────────── */}
        {step === 'welcome' && (
          <motion.div key="welcome" {...slideVariants} transition={{ duration: 0.25 }}
            className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto mb-6">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-zinc-100 mb-3">
              Welcome{user?.firstName ? `, ${user.firstName}` : ''} 👋
            </h1>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              KhattaFlow gives you clarity and control over your money.
              Let&apos;s personalise your setup — takes under 2 minutes.
            </p>
            <button onClick={() => goTo('profile')}
              className="flex items-center gap-2 mx-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl font-semibold transition-all active:scale-95">
              Get started <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* ── Profile ─────────────────────────────────────────────── */}
        {step === 'profile' && (
          <motion.div key="profile" {...slideVariants} transition={{ duration: 0.25 }}
            className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-zinc-100 mb-1">What best describes you?</h2>
            <p className="text-zinc-500 mb-6 text-sm">This helps us suggest the right categories.</p>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {PROFILE_OPTIONS.map(({ id, label, desc, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setProfile(id)}
                  className={cn(
                    'flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all',
                    profile === id
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-zinc-100'
                      : 'bg-zinc-900 border-zinc-700/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                  )}
                >
                  <Icon className={cn('w-5 h-5', profile === id ? 'text-emerald-400' : 'text-zinc-500')} />
                  <div>
                    <div className="font-semibold text-sm">{label}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{desc}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => goTo('welcome')} className="px-5 py-3 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl text-sm transition-colors">Back</button>
              <button onClick={() => goTo('income')}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl font-semibold transition-all active:scale-95">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Income ──────────────────────────────────────────────── */}
        {step === 'income' && (
          <motion.div key="income" {...slideVariants} transition={{ duration: 0.25 }}
            className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-zinc-100 mb-1">Your monthly income</h2>
            <p className="text-zinc-500 mb-6 text-sm">Optional — used to calculate your savings rate.</p>

            {/* Custom income label */}
            {profile === 'salaried' && (
              <div className="mb-4">
                <label className="text-xs text-zinc-500 mb-1.5 block">Income label (optional)</label>
                <input
                  type="text"
                  value={incomeName}
                  onChange={e => setIncomeName(e.target.value)}
                  placeholder="e.g. Google Salary, Infosys Salary"
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700/50 rounded-xl text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
            )}

            <div className="relative mb-8">
              <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="number"
                placeholder="0"
                value={salary}
                onChange={e => setSalary(e.target.value)}
                autoFocus
                className="w-full pl-11 pr-4 py-4 bg-zinc-900 border border-zinc-700/50 rounded-xl text-2xl font-bold text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/50 transition-colors tabular-nums"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => goTo('profile')} className="px-5 py-3 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl text-sm transition-colors">Back</button>
              <button onClick={() => goTo('commitments')}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl font-semibold transition-all active:scale-95">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Commitments ─────────────────────────────────────────── */}
        {step === 'commitments' && (
          <motion.div key="commitments" {...slideVariants} transition={{ duration: 0.25 }}
            className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-zinc-100 mb-1">Fixed commitments</h2>
            <p className="text-zinc-500 mb-6 text-sm">Select recurring payments you have every month.</p>
            <div className="space-y-2 mb-8">
              {FIXED_COMMITMENT_OPTIONS.map(opt => {
                const active = commitments.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleCommitment(opt.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all',
                      active
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-zinc-100'
                        : 'bg-zinc-900 border-zinc-700/50 text-zinc-400 hover:border-zinc-600'
                    )}
                  >
                    <div className={cn('w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all',
                      active ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'
                    )}>
                      {active && <Check className="w-2.5 h-2.5 text-zinc-950" />}
                    </div>
                    <span className="text-sm font-medium">{opt.label}</span>
                  </button>
                )
              })}
            </div>
            <div className="flex gap-3">
              <button onClick={() => goTo('income')} className="px-5 py-3 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl text-sm transition-colors">Back</button>
              <button onClick={() => goTo('goal')}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl font-semibold transition-all active:scale-95">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Goal ────────────────────────────────────────────────── */}
        {step === 'goal' && (
          <motion.div key="goal" {...slideVariants} transition={{ duration: 0.25 }}
            className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-zinc-100 mb-1">Savings target</h2>
            <p className="text-zinc-500 mb-6 text-sm">KhattaFlow will alert you when you&apos;re falling short.</p>
            <div className="bg-zinc-900 border border-zinc-700/50 rounded-2xl p-6 mb-6">
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-5xl font-bold text-emerald-400 tabular-nums">{savingsGoal}%</span>
                <span className="text-zinc-500 text-sm">of income</span>
              </div>
              {salary && (
                <p className="text-sm text-zinc-400 mb-4">
                  = ₹{Math.round(parseFloat(salary) * savingsGoal / 100).toLocaleString('en-IN')} / month
                </p>
              )}
              <input
                type="range" min={5} max={50} step={5} value={savingsGoal}
                onChange={e => setSavingsGoal(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-zinc-600 mt-1">
                <span>5%</span><span>25% (recommended)</span><span>50%</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => goTo('commitments')} className="px-5 py-3 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl text-sm transition-colors">Back</button>
              <button onClick={() => goTo('investment')}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl font-semibold transition-all active:scale-95">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Investment style ─────────────────────────────────────── */}
        {step === 'investment' && (
          <motion.div key="investment" {...slideVariants} transition={{ duration: 0.25 }}
            className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-zinc-100 mb-1">Investment style</h2>
            <p className="text-zinc-500 mb-6 text-sm">Shapes which investment categories we create for you.</p>
            <div className="space-y-3 mb-8">
              {INVESTMENT_OPTIONS.map(({ id, label, desc, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => { setInvestmentStyle(id); setDeselectedNames(new Set()) }}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all',
                    investmentStyle === id
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-zinc-100'
                      : 'bg-zinc-900 border-zinc-700/50 text-zinc-400 hover:border-zinc-600'
                  )}
                >
                  <Icon className={cn('w-5 h-5 shrink-0', investmentStyle === id ? 'text-emerald-400' : 'text-zinc-500')} />
                  <div>
                    <div className="font-semibold text-sm">{label}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{desc}</div>
                  </div>
                  {investmentStyle === id && (
                    <Check className="w-4 h-4 text-emerald-400 ml-auto shrink-0" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => goTo('goal')} className="px-5 py-3 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl text-sm transition-colors">Back</button>
              <button onClick={() => goTo('preview')}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl font-semibold transition-all active:scale-95">
                Preview categories <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Preview ─────────────────────────────────────────────── */}
        {step === 'preview' && (
          <motion.div key="preview" {...slideVariants} transition={{ duration: 0.25 }}
            className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-zinc-100 mb-1">Your categories</h2>
            <p className="text-zinc-500 mb-4 text-sm">
              {activeSlugs.size} of {categories.length} categories selected. Uncheck any you don&apos;t need.
            </p>
            <div className="bg-zinc-900 border border-zinc-700/50 rounded-2xl overflow-hidden mb-6 max-h-[50vh] overflow-y-auto custom-scroll">
              {Object.entries(groupedCategories).map(([group, cats]) => (
                <div key={group}>
                  <div className="px-4 py-2 bg-zinc-800/50 border-b border-zinc-700/30">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{group}</span>
                  </div>
                  {cats.map(cat => (
                    <button
                      key={cat.slug}
                      onClick={() => toggleSlug(cat.slug)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/40 transition-colors border-b border-zinc-800/30 last:border-0"
                    >
                      <div
                        className={cn('w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all',
                          activeSlugs.has(cat.slug) ? 'border-transparent' : 'border-zinc-600 bg-transparent'
                        )}
                        style={activeSlugs.has(cat.slug) ? { backgroundColor: cat.color } : {}}
                      >
                        {activeSlugs.has(cat.slug) && <Check className="w-2 h-2 text-white" />}
                      </div>
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="flex-1 text-sm text-left text-zinc-200">{cat.name}</span>
                      <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', TYPE_COLORS[cat.type], TYPE_BG[cat.type])}>
                        {cat.type}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => goTo('investment')} className="px-5 py-3 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl text-sm transition-colors">Back</button>
              <button
                onClick={handleFinish}
                disabled={activeSlugs.size === 0}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 rounded-xl font-semibold transition-all active:scale-95"
              >
                Set up my account <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Setup (loading) ──────────────────────────────────────── */}
        {step === 'setup' && (
          <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-center">
            <div className="w-14 h-14 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-zinc-200 mb-2">Setting up your account…</h2>
            <p className="text-zinc-500 text-sm">Creating {activeSlugs.size} personalised categories</p>
          </motion.div>
        )}

        {/* ── Done ─────────────────────────────────────────────────── */}
        {step === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }} className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-zinc-950" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 mb-3">You&apos;re all set! 🎉</h2>
            <p className="text-zinc-400 mb-8">
              Your personalised dashboard is ready. Add your first transaction to get started.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl font-semibold transition-all active:scale-95"
            >
              Go to Dashboard
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
