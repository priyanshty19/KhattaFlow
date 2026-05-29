// lib/services/notifications.ts
// In-app notification helper. Best-effort: notification failures must never break
// the originating action (adding an expense, accepting an invite, etc.), so all
// writes are wrapped and swallow errors.
import { prisma } from '@/lib/prisma'

export type NotificationType =
  | 'split_added'
  | 'split_expense'
  | 'split_settlement'
  | 'settlement_reminder'

export interface NotificationInput {
  userId: string // recipient FinGrid (Clerk) userId
  type: NotificationType
  title: string
  body?: string
  link?: string
  groupId?: string
}

/** Create a single notification. Returns null (and logs) on failure — never throws. */
export async function createNotification(input: NotificationInput) {
  try {
    return await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        groupId: input.groupId ?? null,
      },
    })
  } catch (err) {
    console.warn('[notifications] createNotification failed:', (err as Error).message)
    return null
  }
}

/**
 * Create many notifications at once (e.g. notify every group member of a new expense).
 * Recipients without a linked FinGrid user row are skipped. Never throws.
 */
export async function createNotifications(inputs: NotificationInput[]) {
  const valid = inputs.filter((i) => !!i.userId)
  if (!valid.length) return { count: 0 }
  try {
    return await prisma.notification.createMany({
      data: valid.map((i) => ({
        userId: i.userId,
        type: i.type,
        title: i.title,
        body: i.body ?? null,
        link: i.link ?? null,
        groupId: i.groupId ?? null,
      })),
    })
  } catch (err) {
    console.warn('[notifications] createNotifications failed:', (err as Error).message)
    return { count: 0 }
  }
}
