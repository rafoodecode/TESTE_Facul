import { db } from '@/lib/db'
import { requireRole, fail, handleError } from '@/lib/http'
import { NextResponse } from 'next/server'
import { z } from 'zod'
const schema = z.object({ nome: z.string().trim().min(2), tipo: z.enum(['AUDITORIO', 'SALA']) })
type Ctx = { params: Promise<{ id: string }> }
export async function PATCH(req: Request, ctx: Ctx) { const a = await requireRole('GERENTE'); if ('error' in a) return a.error; const p = schema.safeParse(await req.json()); if (!p.success) return fail('Dados do local inválidos.'); try { return NextResponse.json(await db.local.update({ where: { id: (await ctx.params).id }, data: p.data })) } catch (e) { return handleError(e) } }
export async function DELETE(_: Request, ctx: Ctx) { const a = await requireRole('GERENTE'); if ('error' in a) return a.error; const id = (await ctx.params).id; if (await db.reserva.count({ where: { localId: id, data: { gte: new Date() }, status: { in: ['PENDENTE', 'AGENDADO'] } } })) return fail('Cancele as reservas futuras antes de remover este local.', 409); try { await db.local.update({ where: { id }, data: { ativo: false } }); return NextResponse.json({ ok: true }) } catch (e) { return handleError(e) } }
