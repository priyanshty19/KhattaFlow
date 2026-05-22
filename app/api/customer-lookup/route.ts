export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateOtp, hashOtp } from '@/lib/utils/otp'
import { sendOtpEmail } from '@/lib/services/email'
import { sendOtpSms } from '@/lib/services/sms'

function validateApiKey(req: Request): boolean {
  const key = req.headers.get('x-api-key')
  return !!key && key === process.env.CUSTOMER_LOOKUP_API_KEY
}

export async function GET(req: Request) {
  if (!validateApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')?.trim() || null
  const phone = searchParams.get('phone')?.trim() || null

  if (!email && !phone) {
    return NextResponse.json({ error: 'Provide at least one of: email, phone' }, { status: 400 })
  }

  const user = await prisma.user.findFirst({
    where: email ? { email } : { phone: phone! },
  })

  if (!user) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  // Rate limit: max 5 OTP requests per identifier in 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
  const recentCount = await prisma.otpVerification.count({
    where: { identifier: email ?? phone!, createdAt: { gte: tenMinutesAgo } },
  })
  if (recentCount >= 5) {
    return NextResponse.json({ error: 'Too many requests. Try again in 10 minutes.' }, { status: 429 })
  }

  const otp = generateOtp()
  const codeHash = hashOtp(otp)
  const expirySeconds = parseInt(process.env.OTP_EXPIRY_SECONDS ?? '300', 10)
  const expiresAt = new Date(Date.now() + expirySeconds * 1000)

  const record = await prisma.otpVerification.create({
    data: { identifier: email ?? phone!, codeHash, expiresAt, userId: user.id },
  })

  if (email) {
    await sendOtpEmail(email, otp)
  } else {
    await sendOtpSms(phone!, otp)
  }

  return NextResponse.json({ status: 'otp_sent', sessionId: record.sessionId })
}
