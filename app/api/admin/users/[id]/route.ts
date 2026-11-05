import { db } from '@/lib/db'
import { fail, requireRole } from '@/lib/http'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({ papel: z.enum(['USUARIO', 'GERENTE', 'ADMIN_GERAL']) })

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('ADMIN_GERAL')
  if ('error' in auth) return auth.error
  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return fail('Perfil inválido.')
  const { id } = await ctx.params
  if (id === auth.user!.id && parsed.data.papel !== 'ADMIN_GERAL') return fail('Você não pode remover seu próprio perfil de administrador geral.', 409)
  const user = await db.user.findUnique({ where: { id }, select: { id: true, papel: true, cpf: true } })
  if (!user) return fail('Conta não encontrada.', 404)
  if (user.papel === 'ADMIN_GERAL' && parsed.data.papel !== 'ADMIN_GERAL') return fail('O perfil de administrador geral não pode ser removido nesta tela.', 409)
  if (parsed.data.papel !== 'USUARIO' && !user.cpf) return fail('CPF validado é necessário para perfis de gestão.', 409)
  const updated = await db.user.update({ where: { id }, data: { papel: parsed.data.papel }, select: { id: true, nome: true, email: true, matricula: true, papel: true, criadoEm: true } })
  return NextResponse.json(updated)
}
