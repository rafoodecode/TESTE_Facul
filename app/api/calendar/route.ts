import { db } from '@/lib/db'
import { currentUser } from '@/lib/auth'
import { fail } from '@/lib/http'
import { dayState, todayRecife, type Turno, type Status } from '@/lib/rules'
import { NextResponse } from 'next/server'
export async function GET(req: Request) {
  if (!await currentUser()) return fail('Faça login para continuar.', 401)
  const q = new URL(req.url).searchParams; const localId = q.get('localId'); const month = q.get('month')
  if (!localId || !month || !/^\d{4}-\d{2}$/.test(month)) return fail('Selecione local e mês.')
  const local = await db.local.findFirst({ where: { id: localId, ativo: true } }); if (!local) return fail('Local indisponível.', 404)
  const start = new Date(`${month}-01T12:00:00Z`); if (Number.isNaN(start.getTime())) return fail('Mês inválido.')
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1, 12))
  const [reservas, feriados] = await Promise.all([db.reserva.findMany({ where: { localId, data: { gte: start, lt: end }, status: { in: ['PENDENTE', 'AGENDADO'] } }, select: { data: true, turno: true, status: true } }), db.feriado.findMany({ where: { data: { gte: start, lt: end } }, select: { data: true } })])
  const holidaySet = new Set(feriados.map(h => h.data.toISOString().slice(0, 10)))
  const days = []
  for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) { const date = d.toISOString().slice(0, 10); const statuses: Partial<Record<Turno, Status>> = {}; for (const r of reservas.filter(r => r.data.toISOString().slice(0, 10) === date)) statuses[r.turno] = r.status; days.push({ date, state: dayState(date, statuses, holidaySet, todayRecife()), statuses }) }
  return NextResponse.json(days)
}
