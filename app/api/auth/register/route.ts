import { db } from '@/lib/db'
import { setSession } from '@/lib/auth'
import { fail, handleError } from '@/lib/http'
import { registerSchema } from '@/lib/validators'
import { dateOnly } from '@/lib/rules'
import { hash } from 'bcryptjs'
import { NextResponse } from 'next/server'
export async function POST(req: Request) {
  try {
    const parsed = registerSchema.safeParse(await req.json())
    if (!parsed.success) return fail(parsed.error.issues[0].message)
    const v = parsed.data
    if (v.papel === 'GERENTE' && process.env.MANAGER_INVITE_CODE && v.convite !== process.env.MANAGER_INVITE_CODE) return fail('Código de convite inválido.', 403)
    const user = await db.user.create({ data: { nome: v.nome, email: v.email, matricula: v.matricula, dataNascimento: dateOnly(v.dataNascimento), senhaHash: await hash(v.senha, 12), papel: v.papel, cpf: v.papel === 'GERENTE' ? v.cpf!.replace(/\D/g, '') : null } })
    await setSession(user.id)
    return NextResponse.json({ papel: user.papel }, { status: 201 })
  } catch (e) { return handleError(e) }
}
