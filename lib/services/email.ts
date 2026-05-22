export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM ?? 'noreply@khattaflow.in'

  if (!apiKey) {
    // Dev fallback — log OTP to console instead of sending
    console.log(`[DEV] OTP for ${to}: ${otp}`)
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      subject: 'Your KhattaFlow verification code',
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px">
          <h2 style="color:#10b981;margin-bottom:8px">KhattaFlow</h2>
          <p style="color:#71717a;margin-bottom:24px">Someone requested access to your financial data.</p>
          <div style="background:#f4f4f5;border-radius:12px;padding:24px;text-align:center">
            <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#18181b">${otp}</span>
          </div>
          <p style="color:#71717a;font-size:13px;margin-top:16px">
            This code expires in 5 minutes. If you did not request this, ignore this email.
          </p>
        </div>
      `,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend error ${res.status}: ${body}`)
  }
}
