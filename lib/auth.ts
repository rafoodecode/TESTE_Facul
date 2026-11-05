import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { db } from './db'
const name = 'eventos_session'
function key() { const secret = process.env.SESSION_SECRET; if (!secret || secret.length < 32) throw new Error('SESSION_SECRET deve ter ao menos 32 caracteres.'); return new TextEncoder().encode(secret) }
export async function setSession(id: string) {
  const token = await new SignJWT({ sub: id }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('7d').sign(key())
  ;(await cookies()).set(name, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 604800 })
}
export async function clearSession() { (await cookies()).delete(name) }
export async function currentUser() {
  try {
    const token = (await cookies()).get(name)?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, key())
    if (!payload.sub) return null
    return await db.user.findUnique({ where: { id: payload.sub }, select: { id: true, nome: true, email: true, matricula: true, papel: true } })
  } catch { return null }
}
