import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

function getKey(): Buffer {
  const secret = process.env.OTP_SECRET ?? 'fallback-dev-secret-32-chars!!!!'
  return Buffer.from(secret.padEnd(32, '0').slice(0, 32), 'utf8')
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':')
}

export function decryptToken(encoded: string): string {
  const [ivB64, authTagB64, encryptedB64] = encoded.split(':')
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const encrypted = Buffer.from(encryptedB64, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', getKey(), iv)
  decipher.setAuthTag(authTag)
  return decipher.update(encrypted) + decipher.final('utf8')
}
