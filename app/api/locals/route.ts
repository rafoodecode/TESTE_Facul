import { db } from '@/lib/db'
import { requireRole, fail, handleError } from '@/lib/http'
import { NextResponse } from 'next/server'
import { z } from 'zod'
const schema = z.object({ nome: z.string().trim().min(2), tipo: z.enum(['AUDITORIO', 'SALA']) })
export async function GET() { const auth = await requireRole('USUARIO'); if ('error' in auth) { const manager = await requireRole('GERENTE'); if ('error' in manager) return manager.error } return NextResponse.json(await db.local.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } })) }
export async function POST(req: Request) { const a = await requireRole('GERENTE'); if ('error' in a) return a.error; const p = schema.safeParse(await req.json()); if (!p.success) return fail('Informe nome e tipo do local.'); try { return NextResponse.json(await db.local.create({ data: p.data }), { status: 201 }) } catch (e) { return handleError(e) } }
