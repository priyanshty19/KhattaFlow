export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyOtp } from '@/lib/utils/otp'
import { fetchCustomerData } from '@/lib/ces/customer-data'

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
