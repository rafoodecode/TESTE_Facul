import { db } from '@/lib/db'
import { requireRole, fail, handleError } from '@/lib/http'
import { dateOnly } from '@/lib/rules'
import { NextResponse } from 'next/server'
import { z } from 'zod'
const schema = z.object({ data: z.string().date(), descricao: z.string().trim().min(2) })
export async function GET() { const a = await requireRole('USUARIO'); if ('error' in a) { const m = await requireRole('GERENTE'); if ('error' in m) return m.error } return NextResponse.json(await db.feriado.findMany({ orderBy: { data: 'asc' } })) }
export async function POST(req: Request) { const a = await requireRole('GERENTE'); if ('error' in a) return a.error; const p = schema.safeParse(await req.json()); if (!p.success) return fail('Data ou descrição inválida.'); try { const data = dateOnly(p.data.data); if (await db.reserva.count({ where: { data, status: { in: ['PENDENTE', 'AGENDADO'] } } })) return fail('Cancele as reservas ativas antes de cadastrar o feriado.', 409); return NextResponse.json(await db.feriado.create({ data: { data, descricao: p.data.descricao } }), { status: 201 }) } catch (e) { return handleError(e) } }
