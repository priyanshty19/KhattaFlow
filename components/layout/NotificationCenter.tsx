'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, Users, Receipt, ArrowLeftRight, BellRing } from 'lucide-react'
import { useNotifications, useMarkNotificationRead, type AppNotification } from '@/lib/queries/notifications'
import { formatRelativeTime } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'

const TYPE_ICON: Record<AppNotification['type'], React.ComponentType<{ className?: string }>> = {
  split_added: Users,
  split_expense: Receipt,
  split_settlement: ArrowLeftRight,
  settlement_reminder: BellRing,
}

export function NotificationCenter({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { data } = useNotifications()
  const markRead = useMarkNotificationRead()

  const notifications = data?.notifications ?? []
  const unread = data?.unreadCount ?? 0

  const onItemClick = (n: AppNotification) => {
    if (!n.read) markRead.mutate({ id: n.id })
    setOpen(false)
    if (n.link) router.push(n.link as any)
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-zinc-950 text-[10px] font-bold flex items-center justify-center tabular-nums">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* click-away backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] z-50 rounded-xl border border-zinc-700/50 bg-zinc-900 shadow-2xl shadow-black/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-200">Notifications</h3>
              {unread > 0 && (
                <button
                  onClick={() => markRead.mutate({ all: true })}
                  className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[24rem] overflow-y-auto">
              {!notifications.length ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                  <Bell className="w-6 h-6 text-zinc-700" />
                  <p className="text-xs text-zinc-600">You&apos;re all caught up</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const Icon = TYPE_ICON[n.type] ?? Bell
                  return (
                    <button
                      key={n.id}
                      onClick={() => onItemClick(n)}
                      className={cn(
                        'w-full text-left flex items-start gap-3 px-4 py-3 border-b border-zinc-800/60 hover:bg-zinc-800/40 transition-colors',
                        !n.read && 'bg-emerald-500/[0.04]',
                      )}
                    >
                      <span className="mt-0.5 flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 shrink-0">
                        <Icon className="w-3.5 h-3.5 text-emerald-400" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-zinc-200 font-medium truncate">{n.title}</p>
                          {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                        </div>
                        {n.body && <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{n.body}</p>}
                        <p className="text-[10px] text-zinc-600 mt-1">{formatRelativeTime(n.createdAt)}</p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
