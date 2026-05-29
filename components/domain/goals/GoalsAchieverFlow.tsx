'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Rocket, Plus, SlidersHorizontal, Check, ArrowRight } from 'lucide-react'
import {
  useGoals, useAllocations, useGoalPlan,
  useCreateGoal, useUpdateGoal, useDeleteGoal, useUpsertAllocations,
} from '@/lib/queries/goals'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils/cn'
import { GoalForm } from './GoalForm'
import { GoalFormModal } from './GoalFormModal'
import { AllocationGrid } from './AllocationGrid'
import { GoalPlanResults } from './GoalPlanResults'
import type { CreateGoalInput } from '@/lib/validations/goal'

type WizardStep = 0 | 1 | 2

export function GoalsAchieverFlow() {
  const { data: goals, isLoading: goalsLoading } = useGoals()
  const { data: allocations = [], isLoading: allocLoading } = useAllocations()
  const { data: plan, isLoading: planLoading } = useGoalPlan()

  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()
  const upsertAllocations = useUpsertAllocations()

  const [wizardStep, setWizardStep] = useState<WizardStep>(0)
  const [addOpen, setAddOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [showInvestments, setShowInvestments] = useState(false)

  const hasGoals = (goals?.length ?? 0) > 0
  const loading = goalsLoading || allocLoading

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-64 rounded-lg bg-zinc-900 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-zinc-900 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-zinc-900 animate-pulse" />
      </div>
    )
  }

  // ── First-time wizard ──────────────────────────────────────────────────────
  if (!hasGoals) {
    return (
      <Wizard
        step={wizardStep}
        onAddGoal={(values) =>
          createGoal.mutate(values, { onSuccess: () => setWizardStep(1) })
        }
        addPending={createGoal.isPending}
        existingAllocations={allocations}
        onSaveAllocations={(data) =>
          upsertAllocations.mutate(data, { onSuccess: () => setWizardStep(2) })
        }
        savePending={upsertAllocations.isPending}
        plan={plan}
        planLoading={planLoading}
        onSkipToResults={() => setWizardStep(2)}
        onAddAnother={() => setWizardStep(0)}
      />
    )
  }

  // ── Returning dashboard ─────────────────────────────────────────────────────
  const editingGoal = plan?.goals.find((g) => g.goalId === editId)

  return (
    <div className="flex flex-col gap-5">
      {/* Action bar */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => setShowInvestments((s) => !s)}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors',
            showInvestments
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              : 'text-zinc-300 border-zinc-700/50 hover:bg-zinc-800/60',
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Investments
        </button>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          Add goal
        </button>
      </div>

      <AnimatePresence>
        {showInvestments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 md:p-5">
              <h3 className="text-sm font-semibold text-zinc-200 mb-1">Your monthly investments</h3>
              <p className="text-xs text-zinc-500 mb-4">Update what you invest each month — your plan recalculates instantly.</p>
              <AllocationGrid
                existing={allocations}
                pending={upsertAllocations.isPending}
                saveLabel="Update investments"
                onSave={(data) => upsertAllocations.mutate(data, { onSuccess: () => setShowInvestments(false) })}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {plan && (
        <GoalPlanResults
          plan={plan}
          onEditGoal={(id) => setEditId(id)}
          onDeleteGoal={(id) => {
            if (confirm('Remove this goal?')) deleteGoal.mutate(id)
          }}
        />
      )}

      {/* Add goal modal */}
      <GoalFormModal
        open={addOpen}
        title="Add a goal"
        submitLabel="Add goal"
        pending={createGoal.isPending}
        onSubmit={(values) => createGoal.mutate(values, { onSuccess: () => setAddOpen(false) })}
        onClose={() => setAddOpen(false)}
      />

      {/* Edit goal modal */}
      <GoalFormModal
        open={!!editId}
        title="Edit goal"
        submitLabel="Save changes"
        pending={updateGoal.isPending}
        initial={
          editingGoal
            ? {
                name: editingGoal.name,
                targetAmount: editingGoal.target,
                targetDate: editingGoal.targetDate.slice(0, 10),
              }
            : undefined
        }
        onSubmit={(values) =>
          editId && updateGoal.mutate({ id: editId, data: values }, { onSuccess: () => setEditId(null) })
        }
        onClose={() => setEditId(null)}
      />
    </div>
  )
}

// ── Wizard ────────────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Set a goal', icon: Rocket },
  { label: 'Your investments', icon: SlidersHorizontal },
  { label: 'See your plan', icon: Check },
]

function Wizard({
  step,
  onAddGoal,
  addPending,
  existingAllocations,
  onSaveAllocations,
  savePending,
  plan,
  planLoading,
  onSkipToResults,
  onAddAnother,
}: {
  step: WizardStep
  onAddGoal: (values: CreateGoalInput) => void
  addPending: boolean
  existingAllocations: any[]
  onSaveAllocations: (data: any) => void
  savePending: boolean
  plan: any
  planLoading: boolean
  onSkipToResults: () => void
  onAddAnother: () => void
}) {
  return (
    <div className="max-w-3xl">
      {/* Stepper */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const active = i === step
          const done = i < step
          return (
            <div key={s.label} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                  active
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                    : done
                      ? 'text-emerald-400/70 border-emerald-500/20'
                      : 'text-zinc-500 border-zinc-700/50',
                )}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className="w-4 h-px bg-zinc-700/50" />}
            </div>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
        >
          {step === 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 md:p-6">
              <div className="flex items-center gap-2 mb-1">
                <Rocket className="w-4 h-4 text-emerald-400" />
                <h2 className="text-base font-semibold text-zinc-100">What are you saving for?</h2>
              </div>
              <p className="text-sm text-zinc-500 mb-5">Set a target amount and date. We'll project whether you'll get there.</p>
              <GoalForm submitLabel="Continue" pending={addPending} onSubmit={onAddGoal} />
            </div>
          )}

          {step === 1 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 md:p-6">
              <div className="flex items-center gap-2 mb-1">
                <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                <h2 className="text-base font-semibold text-zinc-100">Where do you invest each month?</h2>
              </div>
              <p className="text-sm text-zinc-500 mb-5">
                Enter your monthly SIP per vehicle and any existing corpus. Leave blank what you don't use.
              </p>
              <AllocationGrid
                existing={existingAllocations}
                pending={savePending}
                saveLabel="See my plan"
                onSave={onSaveAllocations}
              />
              <button
                onClick={onSkipToResults}
                className="mt-3 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Skip for now
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              {planLoading ? (
                <div className="h-64 rounded-2xl bg-zinc-900 animate-pulse" />
              ) : plan && plan.goals.length ? (
                <>
                  <GoalPlanResults plan={plan} />
                  <button
                    onClick={onAddAnother}
                    className="mt-5 flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add another goal
                  </button>
                </>
              ) : (
                <EmptyState
                  icon={Rocket}
                  title="No plan yet"
                  description="Add a goal and your monthly investments to see your projection."
                  action={{ label: 'Start over', onClick: onAddAnother }}
                />
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {step < 2 && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-zinc-600">
          <ArrowRight className="w-3 h-3" />
          Step {step + 1} of 3
        </p>
      )}
    </div>
  )
}
