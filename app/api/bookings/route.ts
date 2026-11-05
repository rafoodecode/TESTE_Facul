import { db } from '@/lib/db'
import { requireRole, fail, handleError } from '@/lib/http'
import { bookingSchema } from '@/lib/validators'
import { blocked, dateOnly, dayState, todayRecife } from '@/lib/rules'
import { NextResponse } from 'next/server'
export async function GET() { const a = await requireRole('USUARIO'); if ('error' in a) return a.error; return NextResponse.json(await db.reserva.findMany({ where: { usuarioId: a.user!.id }, include: { local: { select: { nome: true } } }, orderBy: { criadoEm: 'desc' } })) }
export async function POST(req: Request) {
  const a = await requireRole('USUARIO'); if ('error' in a) return a.error
  const p = bookingSchema.safeParse(await req.json()); if (!p.success) return fail('Preencha local, evento, data e turno válidos.')
  const v = p.data; const data = dateOnly(v.data)
  try {
    const result = await db.$transaction(async tx => {
      const local = await tx.local.findFirst({ where: { id: v.localId, ativo: true } }); if (!local) throw new Error('Local indisponível.')
      const holiday = await tx.feriado.findUnique({ where: { data } }); if (blocked(v.data, new Set(holiday ? [v.data] : []), todayRecife())) throw new Error('Esta data está indisponível.')
      const active = await tx.reserva.findMany({ where: { localId: v.localId, data, status: { in: ['PENDENTE', 'AGENDADO'] } } })
      const statuses = Object.fromEntries(active.map(r => [r.turno, r.status]))
      if (dayState(v.data, statuses, new Set(), todayRecife()) !== 'BRANCO') throw new Error('Esta data não está disponível.')
      if (active.some(r => r.turno === v.turno)) throw new Error('Este turno já está ocupado.')
      return tx.reserva.create({ data: { usuarioId: a.user!.id, localId: v.localId, nomeEvento: v.nomeEvento, data, turno: v.turno, status: 'PENDENTE' } })
    })
    return NextResponse.json({ ...result, mensagem: 'Solicitação enviada. Aguarde a confirmação do gerente.' }, { status: 201 })
  } catch (e) { return handleError(e) }
}
