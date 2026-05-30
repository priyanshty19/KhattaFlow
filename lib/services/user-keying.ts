import { prisma } from '@/lib/prisma'

/**
 * Tables whose `userId` column references `users.id`. Used only for the rare
 * "target row already exists" merge path. Kept in sync with the schema.
 * (`split_groups` uses `createdById` and is handled separately below.)
 */
const USERID_CHILD_TABLES = [
  'categories',
  'transactions',
  'budgets',
  'recurring_rules',
  'imports',
  'monthly_summaries',
  'otp_verifications',
  'oauth_connections',
  'email_import_logs',
  'credit_card_preferences',
  'card_recommendations',
  'card_recommendation_feedback',
  'card_apply_intents',
  'user_credit_cards',
  'financial_goals',
  'investment_allocations',
  'split_members',
  'notifications',
] as const

/**
 * Merge data from a prior Clerk user that shares this email onto the current `userId`.
 *
 * Background: `User.id` is the Clerk userId and `User.email` is `@unique`. When a
 * person's Clerk id changes (account deletion + re-signup, dev→prod switch, SSO
 * provider change, etc.) an old `users` row keeps the same email under a different
 * id. A naive `user.create` with that email then violates the unique constraint, so
 * any per-user GET that tries to seed silently 500s (the historical categories bug).
 *
 * Strategy — because every FK referencing `users.id` is `ON UPDATE CASCADE` and the
 * email is unique (so at most one old row can exist):
 *  - **Target row does not exist yet (common case):** rename the old row's primary key
 *    to the new id (`UPDATE users SET id = NEW`). Postgres cascades the change to every
 *    child table in one shot — no FK violation, and the user keeps their profile/settings.
 *  - **Target row already exists (rare):** move each child table from the old id to the
 *    new id (the FK target already exists, so this is safe), then delete the old shell.
 *
 * Safe to call repeatedly:
 *  - Guarded with `id: { not: userId }` so we never touch the current row.
 *  - No-op when no orphaned row exists.
 *  - Each path runs in a single transaction (all-or-nothing).
 *
 * @returns the number of orphaned user rows that were merged into `userId`.
 */
export async function rekeyUserByEmail({
  userId,
  email,
}: {
  userId: string
  email: string
}): Promise<number> {
  if (!email) return 0

  // email is @unique, so this returns 0 or 1 row.
  const oldUsers = await prisma.user.findMany({
    where: { email, id: { not: userId } },
    select: { id: true },
  })
  if (oldUsers.length === 0) return 0

  let targetExists = (await prisma.user.count({ where: { id: userId } })) > 0
  let merged = 0

  for (const { id: oldId } of oldUsers) {
    try {
      if (!targetExists) {
        // Rename the old row's PK to the new id. ON UPDATE CASCADE propagates this to
        // every child table automatically. Email is carried over unchanged (no collision,
        // since we're updating, not inserting). If a concurrent request already renamed
        // this row, the WHERE clause matches 0 rows and this is a harmless no-op.
        await prisma.$executeRaw`UPDATE users SET id = ${userId} WHERE id = ${oldId}`
        targetExists = true
      } else {
        // Target already exists: move children old -> new (FK target exists, so this is
        // safe), then delete the now-empty old shell.
        await prisma.$transaction([
          ...USERID_CHILD_TABLES.map(
            (table) =>
              prisma.$executeRawUnsafe(
                `UPDATE "${table}" SET "userId" = $1 WHERE "userId" = $2`,
                userId,
                oldId,
              ),
          ),
          prisma.$executeRaw`UPDATE split_groups SET "createdById" = ${userId} WHERE "createdById" = ${oldId}`,
          prisma.user.delete({ where: { id: oldId } }),
        ])
      }
      merged++
    } catch (err) {
      // Tolerate concurrency: another in-flight request (e.g. a parallel categories GET
      // and onboarding POST) may have merged/renamed this same old row first. If the old
      // row is already gone, treat it as done; otherwise re-throw the real error.
      const stillThere = await prisma.user.count({ where: { id: oldId } })
      if (stillThere > 0) throw err
      targetExists = true
    }
  }

  return merged
}
