/**
 * Invite someone to a Split & Share group.
 * Returns `true` only if an email was actually dispatched via Resend. When
 * `RESEND_API_KEY` is not configured we skip sending (dev/no-mail setups) and
 * return `false` so callers can be honest with the UI instead of claiming a
 * mail went out. Throws if Resend is configured but the send fails.
 */
export async function sendSplitInviteEmail(params: {
  to: string
  groupName: string
  inviterName: string
  inviteUrl: string
}): Promise<boolean> {
  const { to, groupName, inviterName, inviteUrl } = params
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM ?? 'noreply@fingrid.in'

  if (!apiKey) {
    console.log(`[DEV] Split invite for ${to} → ${inviteUrl}`)
    return false
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      subject: `${inviterName} invited you to "${groupName}" on MyFinGrid`,
      html: `
        <div style="font-family:sans-serif;max-width:440px;margin:0 auto;padding:24px">
          <h2 style="color:#10b981;margin-bottom:8px">MyFinGrid · Split &amp; Share</h2>
          <p style="color:#52525b;margin-bottom:20px">
            <strong>${inviterName}</strong> invited you to join the group
            <strong>${groupName}</strong> to split expenses together.
          </p>
          <a href="${inviteUrl}"
             style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;
                    padding:12px 24px;border-radius:12px;font-weight:600">
            Join the group
          </a>
          <p style="color:#a1a1aa;font-size:13px;margin-top:20px">
            Or paste this link into your browser:<br/>
            <span style="color:#71717a">${inviteUrl}</span>
          </p>
        </div>
      `,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend error ${res.status}: ${body}`)
  }

  return true
}

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM ?? 'noreply@fingrid.in'

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
      subject: 'Your MyFinGrid verification code',
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px">
          <h2 style="color:#10b981;margin-bottom:8px">MyFinGrid</h2>
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
