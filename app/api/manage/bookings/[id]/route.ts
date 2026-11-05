import { db } from '@/lib/db'
import { requireRole, fail, handleError } from '@/lib/http'
import { notify } from '@/lib/mail'
import { NextResponse } from 'next/server'
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const a = await requireRole('GERENTE'); if ('error' in a) return a.error
  const { status } = await req.json().catch(() => ({})); if (status !== 'AGENDADO' && status !== 'CANCELADA') return fail('Status inválido.')
  try {
    const reserva = await db.$transaction(async tx => { const old = await tx.reserva.findUnique({ where: { id: (await ctx.params).id }, include: { local: true, usuario: true } }); if (!old || old.status === 'CANCELADA' || (status === 'AGENDADO' && old.status !== 'PENDENTE')) throw new Error('Esta alteração de status não é permitida.'); return tx.reserva.update({ where: { id: old.id }, data: { status }, include: { local: true, usuario: true } }) })
    try { await notify(reserva.usuario.email, { local: reserva.local.nome, evento: reserva.nomeEvento, data: reserva.data.toISOString().slice(0, 10), turno: reserva.turno, status: reserva.status }) } catch { return NextResponse.json({ reserva, aviso: 'Status atualizado, mas o e-mail não pôde ser enviado.' }) }
    return NextResponse.json({ reserva })
  } catch (e) { return handleError(e) }
}
