import { cn } from '@/lib/utils/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-xl', className)} />
}

export function StatCardSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
          <Skeleton className="h-3 w-20 mb-3" />
          <Skeleton className="h-7 w-32 mb-2" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}

export function TransactionListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 flex items-center gap-4">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton() {
  return <Skeleton className="h-64 w-full" />
}
