'use client'
import { TopBar } from '@/components/layout/TopBar'
import { GoalsAchieverFlow } from '@/components/domain/goals/GoalsAchieverFlow'

export default function GoalsPage() {
  return (
    <>
      <TopBar title="Goals" />
      <div className="px-4 md:px-6 lg:px-8 py-4 md:py-6 max-w-[1200px]">
        <div className="mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-semibold text-zinc-100">Goals Achiever</h2>
          <p className="text-sm text-zinc-400 mt-0.5">
            Project your goals against your investments — and get a plan to reach them.
          </p>
        </div>
        <GoalsAchieverFlow />
      </div>
    </>
  )
}
