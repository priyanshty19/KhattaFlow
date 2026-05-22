import { createHmac, timingSafeEqual, randomInt } from 'crypto'

export function generateOtp(): string {
  return String(randomInt(100000, 999999))
}

export function hashOtp(otp: string): string {
  const secret = process.env.OTP_SECRET ?? 'fallback-dev-secret'
  return createHmac('sha256', secret).update(otp).digest('hex')
}

export function verifyOtp(input: string, storedHash: string): boolean {
  const inputHash = hashOtp(input)
  try {
    return timingSafeEqual(Buffer.from(inputHash, 'hex'), Buffer.from(storedHash, 'hex'))
  } catch {
    return false
  }
}
