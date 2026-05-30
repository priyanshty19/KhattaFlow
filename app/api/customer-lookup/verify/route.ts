export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyOtp } from '@/lib/utils/otp'
import { fetchCustomerData } from '@/lib/ces/customer-data'
import { rateLimit, rateLimitKey } from '@/lib/utils/rate-limit'

export async function POST(req: Request) {
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.CUSTOMER_LOOKUP_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { sessionId, otp } = body

  if (!sessionId || !otp) {
    return NextResponse.json({ error: 'sessionId and otp are required' }, { status: 400 })
  }

  // Brute-force guard: cap OTP attempts per session+IP (6-digit codes are otherwise
  // guessable with enough tries against a known sessionId).
  const rl = rateLimit(rateLimitKey(req, `otp-verify:${sessionId}`), { limit: 10, windowMs: 10 * 60_000 })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 600) } },
    )
  }

  const record = await prisma.otpVerification.findUnique({ where: { sessionId } })

  if (!record || record.used || record.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })
  }

  if (!verifyOtp(String(otp), record.codeHash)) {
    return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })
  }

  await prisma.otpVerification.update({ where: { id: record.id }, data: { used: true } })

  if (!record.userId) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  const data = await fetchCustomerData(record.userId)
  if (!data) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  return NextResponse.json(data)
}
