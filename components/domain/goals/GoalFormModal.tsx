'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { GoalForm, type GoalFormValues } from './GoalForm'
import type { CreateGoalInput } from '@/lib/validations/goal'

interface GoalFormModalProps {
  open: boolean
  title: string
  initial?: Partial<GoalFormValues>
  submitLabel?: string
  pending?: boolean
  onSubmit: (values: CreateGoalInput) => void
  onClose: () => void
}

export function GoalFormModal({ open, title, initial, submitLabel, pending, onSubmit, onClose }: GoalFormModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="pointer-events-auto w-full sm:max-w-lg sm:mx-4"
            >
              <div className="bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
                  <button
                    onClick={onClose}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <GoalForm
                  initial={initial}
                  submitLabel={submitLabel}
                  pending={pending}
                  onSubmit={onSubmit}
                  onCancel={onClose}
                />
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
