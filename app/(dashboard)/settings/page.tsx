'use client'
import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { User, Target, Tag, IndianRupee, Building2, Phone, Link2 } from 'lucide-react'
import { toPaise, toRupees } from '@/lib/utils/currency'
import { TopBar } from '@/components/layout/TopBar'
import { CategoryManager } from '@/components/domain/settings/CategoryManager'
import { GmailConnect } from '@/components/domain/settings/GmailConnect'

export default function SettingsPage() {
  const { user } = useUser()
  const searchParams = useSearchParams()
  const [salary, setSalary] = useState('')
  const [goalPct, setGoalPct] = useState(20)
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const err = searchParams.get('error')
    const connected = searchParams.get('connected')
    if (err === 'gmail_not_configured') {
      toast.error('Google OAuth credentials are not set up. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env.local.')
    } else if (err === 'gmail_auth_failed') {
      const detail = searchParams.get('detail')
      toast.error(
        detail ? `Gmail auth failed: ${detail}` : 'Gmail connection failed — check the terminal for details.',
        { duration: 10000 }
      )
    } else if (err === 'gmail_user_not_found') {
      toast.error('Gmail account not found in myFinGrid. Try signing in again.')
    }
    if (connected === 'gmail') {
      toast.success('Gmail connected successfully')
    }
  }, [searchParams])

  useEffect(() => {
    fetch('/api/user')
      .then(r => r.json())
      .then(data => {
        if (data?.monthlySalary) setSalary(String(toRupees(data.monthlySalary)))
        if (data?.savingsGoalPct) setGoalPct(Math.round(data.savingsGoalPct * 100))
        if (data?.companyName) setCompanyName(data.companyName)
        if (data?.phone) setPhone(data.phone)
      })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlySalary: salary ? toPaise(salary) : undefined,
          savingsGoalPct: goalPct / 100,
          companyName: companyName || null,
          phone: phone || null,
        }),
      })
      toast.success('Settings saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const salaryNum = parseFloat(salary) || 0
  const targetSavings = Math.round(salaryNum * goalPct / 100)

  return (
    <>
      <TopBar title="Settings" maxWidth="max-w-2xl" />
      <div className="flex flex-col gap-4 md:gap-6 px-4 md:px-6 lg:px-8 py-4 md:py-6 max-w-2xl mx-auto w-full">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100">Settings</h2>
          <p className="text-sm text-zinc-400 mt-0.5">Manage your profile, goals, and categories.</p>
        </div>

        {/* Profile */}
        <div className="bg-zinc-900 border border-zinc-600/40 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <User className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-200">Profile</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Name</label>
              <p className="text-sm text-zinc-300 bg-zinc-800/50 px-3 py-2.5 rounded-lg">
                {user?.fullName ?? '—'}
              </p>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Email</label>
              <p className="text-sm text-zinc-300 bg-zinc-800/50 px-3 py-2.5 rounded-lg">
                {user?.primaryEmailAddress?.emailAddress ?? '—'}
              </p>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Phone (for SMS lookup)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-zinc-800 border border-zinc-600/40 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Company / Employer</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. Google, Infosys"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-zinc-800 border border-zinc-600/40 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Monthly take-home salary (₹)</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 100000 for ₹1 lakh/month"
                  value={salary}
                  onChange={e => setSalary(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full pl-9 pr-4 py-2.5 bg-zinc-800 border border-zinc-600/40 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors tabular-nums"
                />
              </div>
              {salaryNum > 0 && (
                <p className="text-xs text-emerald-400/80 mt-1.5 tabular-nums">
                  = ₹{salaryNum.toLocaleString('en-IN')}/month
                  {salaryNum >= 100000 && <span className="text-zinc-500 ml-1">({(salaryNum / 100000).toFixed(salaryNum % 100000 === 0 ? 0 : 1)}L)</span>}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Savings Goal */}
        <div className="bg-zinc-900 border border-zinc-600/40 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <Target className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-200">Savings Goal</h3>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-4xl font-bold text-emerald-400 tabular-nums">{goalPct}%</span>
            <span className="text-zinc-500 text-sm">of income</span>
            {targetSavings > 0 && (
              <span className="text-xs text-zinc-600 ml-2">= ₹{targetSavings.toLocaleString('en-IN')}/month</span>
            )}
          </div>
          <input
            type="range" min={5} max={50} step={5}
            value={goalPct} onChange={e => setGoalPct(Number(e.target.value))}
            className="w-full accent-emerald-500 mb-2"
          />
          <div className="flex justify-between text-xs text-zinc-600">
            <span>5% (minimal)</span><span>20% (recommended)</span><span>50% (aggressive)</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 rounded-xl font-semibold text-sm transition-all"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>

        {/* Connected Accounts */}
        <div className="bg-zinc-900 border border-zinc-600/40 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <Link2 className="w-4 h-4 text-zinc-400" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">Connected Accounts</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Connect Gmail to auto-import bank transaction emails.</p>
            </div>
          </div>
          <GmailConnect />
        </div>

        {/* Categories */}
        <div className="bg-zinc-900 border border-zinc-600/40 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <Tag className="w-4 h-4 text-zinc-400" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">Categories</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Add, edit, or delete your spending categories.</p>
            </div>
          </div>
          <CategoryManager />
        </div>
      </div>
    </>
  )
}
