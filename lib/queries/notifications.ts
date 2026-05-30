import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface AppNotification {
  id: string
  type: 'split_added' | 'split_expense' | 'split_settlement' | 'settlement_reminder'
  title: string
  body: string | null
  link: string | null
  groupId: string | null
  read: boolean
  createdAt: string
}

export interface NotificationsResponse {
  notifications: AppNotification[]
  unreadCount: number
}

export const notificationKeys = {
  all: ['notifications'] as const,
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error('Request failed')
  return res.json()
}

export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.all,
    queryFn: () => fetch('/api/notifications').then((r) => json<NotificationsResponse>(r)),
    refetchInterval: 1000 * 30, // poll every 30s — no websockets
    staleTime: 1000 * 15,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { id: string } | { all: true }) =>
      fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(json),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}
