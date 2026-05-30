export const dynamic = 'force-dynamic'
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { encryptToken } from '@/lib/utils/encrypt'
import { rekeyUserByEmail } from '@/lib/services/user-keying'
import type { CategoryTemplate } from '@/constants/categories'

/**
 * Attempt to auto-connect Gmail using Clerk's stored Google OAuth token.
 * This only works when the user signed in with Google AND Clerk's Google OAuth
 * was configured with the gmail.readonly scope.
 * Fails silently — the user can always connect manually from Settings.
 */
async function tryAutoConnectGmail(userId: string): Promise<void> {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return

    // Check if already connected — skip if so
    const existing = await prisma.oAuthConnection.findFirst({
      where: { userId, provider: 'gmail' },
      select: { id: true },
    })
    if (existing) return

    const client = await clerkClient()
    const tokenRes = await client.users.getUserOauthAccessToken(userId, 'oauth_google')
    const accessToken = tokenRes.data?.[0]?.token
    if (!accessToken) return

    // No redirect URI needed: we authenticate with an existing access token,
    // not a redirect-based authorization flow.
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    )
    oauth2Client.setCredentials({ access_token: accessToken })

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    const profile = await gmail.users.getProfile({ userId: 'me' })
    const gmailEmail = profile.data.emailAddress ?? ''
    if (!gmailEmail) return

    await prisma.oAuthConnection.create({
      data: {
        userId,
        provider: 'gmail',
        providerEmail: gmailEmail,
        accessToken: encryptToken(accessToken),
        refreshToken: encryptToken(''), // Clerk manages refresh internally
        tokenExpiresAt: null,
        scopes: 'https://www.googleapis.com/auth/gmail.readonly',
      },
    })
    console.log('[onboarding] gmail_auto_connect success gmailEmail=', gmailEmail)
  } catch (err) {
    // Token lacks gmail.readonly scope or call failed — ignore, user will connect from Settings
    console.log('[onboarding] gmail_auto_connect skipped:', err instanceof Error ? err.message : String(err))
  }
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { salary, savingsGoalPct, categories, companyName, investmentStyle, creditScore } = body as {
    salary?: number
    savingsGoalPct: number
    categories: CategoryTemplate[]
    companyName?: string
    investmentStyle?: string
    creditScore?: number
  }

  const clerkUser = await currentUser()
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? ''

  // Migrate data from any prior Clerk user with the same email (e.g. dev→prod switch).
  // Instead of deleting the old record (which would cascade-delete all transactions),
  // we re-key every child row to the new userId, then remove the now-empty old user shell.
  await rekeyUserByEmail({ userId, email })

  await prisma.$transaction(async (tx) => {
    // Upsert user record
    await tx.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email,
        name: clerkUser?.fullName ?? null,
        monthlySalary: salary ?? null,
        savingsGoalPct,
        companyName: companyName ?? null,
        investmentStyle: investmentStyle ?? null,
        creditScore: creditScore ?? null,
      },
      update: {
        monthlySalary: salary ?? null,
        savingsGoalPct,
        companyName: companyName ?? null,
        investmentStyle: investmentStyle ?? null,
        ...(creditScore !== undefined && { creditScore }),
      },
    })

    // Delete any existing categories (re-onboarding support)
    await tx.category.deleteMany({ where: { userId } })

    // Create selected categories
    await tx.category.createMany({
      data: categories.map(c => ({
        userId,
        name: c.name,
        slug: c.slug,
        type: c.type as any,
        color: c.color,
        isFixed: c.isFixed,
        isSystem: c.isSystem,
        sortOrder: c.sortOrder,
        group: c.group,
      })),
    })
  })

  // Best-effort Gmail auto-connect using Clerk's Google token.
  // Fires after the DB write so onboarding is never blocked by this.
  await tryAutoConnectGmail(userId)

  return NextResponse.json({ ok: true })
}
