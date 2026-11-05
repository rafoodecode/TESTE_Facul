import { db } from '@/lib/db'
import { setSession } from '@/lib/auth'
import { fail } from '@/lib/http'
import { compare } from 'bcryptjs'
import { NextResponse } from 'next/server'
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  if (typeof body.email !== 'string' || typeof body.senha !== 'string') return fail('Informe e-mail e senha.')
  const user = await db.user.findUnique({ where: { email: body.email.trim().toLowerCase() } })
  if (!user || !(await compare(body.senha, user.senhaHash))) return fail('E-mail ou senha inválidos.', 401)
  await setSession(user.id)
  return NextResponse.json({ papel: user.papel })
}
