import { db } from '@/lib/db'
import { requireRole } from '@/lib/http'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await requireRole('ADMIN_GERAL')
  if ('error' in auth) return auth.error
  const users = await db.user.findMany({
    select: { id: true, nome: true, email: true, matricula: true, papel: true, cpf: true, criadoEm: true },
    orderBy: { criadoEm: 'desc' },
  })
  return NextResponse.json(users.map(({ cpf, ...user }) => ({ ...user, podeGerenciar: Boolean(cpf) })))
}
