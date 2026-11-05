import { NextResponse } from 'next/server'
import { currentUser } from './auth'
export const fail = (message: string, status = 400) => NextResponse.json({ erro: message }, { status })
export async function requireRole(role: 'USUARIO' | 'GERENTE' | 'ADMIN_GERAL') {
  const user = await currentUser()
  if (!user) return { error: fail('Faça login para continuar.', 401) }
  if (user.papel !== role && !(role === 'GERENTE' && user.papel === 'ADMIN_GERAL')) return { error: fail('Acesso não autorizado.', 403) }
  return { user }
}
export function handleError(error: unknown) {
  const e = error as { code?: string; message?: string }
  if (e.code === 'P2002' || e.code === '23505') return fail('Este cadastro ou turno já está ocupado. Atualize a página e escolha outro.', 409)
  if (e.message === 'Este turno já está ocupado.' || e.message === 'Esta data não está disponível.') return fail(e.message, 409)
  return fail(e.message || 'Não foi possível concluir a operação.')
}
