// app/split/invite/[token]/page.tsx
// Public invite landing — reachable when logged out (see middleware public matcher).
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { Users, Wallet } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { InviteAccept } from './InviteAccept'

export const dynamic = 'force-dynamic'

async function getInvite(token: string) {
  return prisma.splitInvite.findUnique({
    where: { token },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          type: true,
          _count: { select: { members: true } },
        },
      },
    },
  })
}

export default async function InvitePage({ params }: { params: { token: string } }) {
  const { userId } = await auth()
  const invite = await getInvite(params.token)

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-5 py-12">
      <div
        className="pointer-events-none fixed inset-0 opacity-60"
        style={{ background: 'radial-gradient(ellipse 100% 60% at 50% 0%, rgba(16,185,129,0.10) 0%, transparent 65%)' }}
      />
      <div className="relative z-10 w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-emerald-400 tracking-tight">FinGrid</span>
        </div>
        <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/80 backdrop-blur-sm p-8">
          {children}
        </div>
      </div>
    </div>
  )

  if (!invite) {
    return (
      <Shell>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-zinc-100">Invite not found</h1>
          <p className="text-sm text-zinc-500 mt-2">
            This invite link is invalid or has been removed.
          </p>
        </div>
      </Shell>
    )
  }

  const groupName = invite.group.name
  const memberCount = invite.group._count.members
  const expired = invite.expiresAt < new Date() || invite.status === 'expired'

  return (
    <Shell>
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
          <Users className="w-7 h-7 text-emerald-400" />
        </div>
        <div>
          <p className="text-sm text-zinc-400">You&apos;ve been invited to join</p>
          <h1 className="text-2xl font-bold text-zinc-100 mt-1">{groupName}</h1>
          <p className="text-xs text-zinc-500 mt-2">
            {invite.group.type === 'business' ? 'Business group' : 'Shared expenses'} ·{' '}
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </p>
        </div>

        {expired ? (
          <p className="text-sm text-amber-400 mt-2">This invite has expired.</p>
        ) : userId ? (
          // Signed in → accept immediately.
          <div className="mt-2 w-full">
            <InviteAccept token={params.token} groupName={groupName} />
          </div>
        ) : (
          // Signed out → route through auth, returning to this same invite URL.
          <div className="mt-2 w-full flex flex-col gap-2">
            <Link
              href={`/sign-up?redirect_url=/split/invite/${params.token}` as any}
              className="w-full inline-flex items-center justify-center h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold transition-colors"
            >
              Sign up to join
            </Link>
            <Link
              href={`/sign-in?redirect_url=/split/invite/${params.token}` as any}
              className="w-full inline-flex items-center justify-center h-11 rounded-xl border border-zinc-700 hover:border-zinc-600 text-zinc-200 font-medium transition-colors"
            >
              I already have an account
            </Link>
          </div>
        )}
      </div>
    </Shell>
  )
}
