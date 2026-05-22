export async function sendOtpSms(phone: string, otp: string): Promise<void> {
  const authKey = process.env.MSG91_AUTH_KEY
  const templateId = process.env.MSG91_TEMPLATE_ID
  const senderId = process.env.MSG91_SENDER_ID ?? 'KHATFL'

  if (!authKey || !templateId) {
    // Dev fallback — log OTP to console instead of sending
    console.log(`[DEV] OTP SMS for ${phone}: ${otp}`)
    return
  }

  // Normalize phone: remove spaces/dashes, ensure country code
  const normalized = phone.replace(/[\s\-()]/g, '')

  const res = await fetch('https://api.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: { authkey: authKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      flow_id: templateId,
      sender: senderId,
      mobiles: normalized,
      OTP: otp,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`MSG91 error ${res.status}: ${body}`)
  }
}
