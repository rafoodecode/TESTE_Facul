import { db } from '@/lib/db'
import { requireRole, handleError } from '@/lib/http'
import { NextResponse } from 'next/server'
export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) { const a = await requireRole('GERENTE'); if ('error' in a) return a.error; try { await db.feriado.delete({ where: { id: (await ctx.params).id } }); return NextResponse.json({ ok: true }) } catch (e) { return handleError(e) } }
