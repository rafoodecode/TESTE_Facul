import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
const db = new PrismaClient()
const password = process.env.SEED_PASSWORD || 'TroqueEstaSenha123!'
async function main() {
  const senhaHash = await hash(password, 12)
  const year = new Date().getFullYear()
  const manager = await db.user.upsert({ where: { email: 'gerente@instituicao.edu.br' }, update: {}, create: { nome: 'Gerente Demonstração', email: 'gerente@instituicao.edu.br', matricula: 'G001', cpf: '52998224725', dataNascimento: new Date('1980-01-01T12:00:00Z'), senhaHash, papel: 'GERENTE' } })
  const users = []
  for (const n of [1, 2]) users.push(await db.user.upsert({ where: { email: `usuario${n}@instituicao.edu.br` }, update: {}, create: { nome: `Usuário ${n}`, email: `usuario${n}@instituicao.edu.br`, matricula: `U00${n}`, dataNascimento: new Date('1990-01-01T12:00:00Z'), senhaHash, papel: 'USUARIO' } }))
  const locals = []
  for (const [name, tipo] of [['Auditório Principal','AUDITORIO'],['Sala 101','SALA'],['Sala 202','SALA']] as const) { let local = await db.local.findFirst({ where: { nome: name } }); if (!local) local = await db.local.create({ data: { nome: name, tipo } }); locals.push(local) }
  for (const [date, descricao] of [['01-01','Confraternização Universal'],['04-21','Tiradentes'],['05-01','Dia do Trabalho'],['09-07','Independência do Brasil'],['10-12','Nossa Senhora Aparecida'],['11-02','Finados'],['11-15','Proclamação da República'],['11-20','Consciência Negra'],['12-25','Natal']]) await db.feriado.upsert({ where: { data: new Date(`${year}-${date}T12:00:00Z`) }, update: {}, create: { data: new Date(`${year}-${date}T12:00:00Z`), descricao } })
  const day = new Date(); day.setDate(day.getDate() + 3); while ([0,6].includes(day.getDay())) { day.setDate(day.getDate()+1) } const date = new Date(`${day.toISOString().slice(0,10)}T12:00:00Z`)
  for (const [i, status] of ['PENDENTE','AGENDADO','CANCELADA'].entries()) { const exists = await db.reserva.findFirst({ where: { localId: locals[i].id, data: date, turno: 'MANHA' } }); if (!exists) await db.reserva.create({ data: { usuarioId: users[i % 2].id, localId: locals[i].id, nomeEvento: `Evento ${status.toLowerCase()}`, data: date, turno: 'MANHA', status: status as 'PENDENTE'|'AGENDADO'|'CANCELADA' } }) }
  console.log('Seed concluído. Gerente:', manager.email, 'Senha configurada em SEED_PASSWORD.')
}
main().finally(() => db.$disconnect())
